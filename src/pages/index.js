import { useCallback, useEffect, useState } from "react"
// @mui
import {
  Grid,
  Container,
  Typography,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  IconButton,
  Box,
  Autocomplete,
  TextField,
  Dialog,
  DialogContent,
  DialogActions,
  LinearProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Switch,
  FormControlLabel,
  CircularProgress,
  Card,
  Chip,
  TablePagination,
  useTheme,
} from "@mui/material"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import AddIcon from "@mui/icons-material/Add"
import CloseIcon from "@mui/icons-material/Close"
import { nanoid } from "nanoid"
import "react-responsive-carousel/lib/styles/carousel.min.css" // requires a loader
import { Carousel } from "react-responsive-carousel"
// sections

import { useFieldArray, useForm } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup"

import { stateToJson, jsonToState } from "@utils/paramPort"
import mapObject from "@utils/mapObject"
import { inputConfig } from "@components/DiscoInput/discoParameterConfig"
import { DynamicInput, ControlledTextField } from "@components/DiscoInput"
import useOpenState from "@hooks/useOpenState"
import Image from "next/image"
import QueueEntry from "@components/QueueEntry"
import useSWR from "swr"
import { useDropzone } from "react-dropzone"

// TODO: add real validation schema here
const validationSchema = yup.object({})

const getThumbnailDimensions = ({ height, width, maxWidth = 80 }) => {
  try {
    const aspectRatio = height / width

    const adjustedWidth = Math.min(maxWidth, width)

    const adjustedHeight = adjustedWidth * aspectRatio

    return {
      height: adjustedHeight,
      width: adjustedWidth,
    }
  } catch (e) {
    return { height: 300, width: 400 }
  }
}

export default function Home() {
  const theme = useTheme()
  const [exportedJson, setExportedJson] = useState()
  const [jsonToImport, setJsonToImport] = useState()
  const [previewWidth, setPreviewWidth] = useState(500)
  const [refreshModelAutocomplete, setRefreshModelAutocomplete] = useState(false)
  const [file, setFile] = useState()
  const [initImagePreview, setInitImagePreview] = useState()
  const { data: jobData, mutate: refetchJobQueue } = useSWR("/api/list", null, {
    refreshInterval: 10000,
    keepPreviousData: true,
  })
  const { data: progressData } = useSWR("/api/progress", null, {
    refreshInterval: 10000,
  })

  const [exportOpen, openExportModal, closeExportModal] = useOpenState()
  const [importOpen, openImportModal, closeImportModal] = useOpenState()
  const [showAllJobs, setShowAllJobs] = useState(false)
  const [jsonValidationError, setJsonValidationError] = useState("")

  const onDrop = useCallback(async (acceptedFiles) => {
    const [file] = acceptedFiles
    if (file) {
      setInitImagePreview(URL.createObjectURL(file))
      setFile(file)
    }
  }, [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  const { getValues, reset, control, watch } = useForm({
    defaultValues: mapObject({ valueMapper: (value) => value?.default, mapee: inputConfig }),

    resolver: yupResolver(validationSchema),
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "text_prompts",
  })

  const { remove: removeClipModel, append: appendClipModel } = useFieldArray({
    control,
    name: "clip_models",
  })

  const clipModels = watch("clip_models")

  const handleImport = (jsonString) => () => {
    try {
      const newState = jsonString ? jsonToState(jsonString) : jsonToState(jsonToImport)
      reset(newState)
      setJsonValidationError("")
      closeImportModal()
    } catch (e) {
      console.log(e)
      setJsonValidationError("Invalid JSON")
    }
  }

  const handleExport = () => {
    try {
      const jsonToExport = stateToJson(getValues())

      setExportedJson(JSON.stringify(jsonToExport, null, 2))
      openExportModal()
    } catch (e) {
      console.log(e)
    }
  }
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(5)

  const handleChangePage = (event, newPage) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const handleQueueRemove = (jobId) => async () => {
    const payload = {
      jobId,
    }

    await fetch("/api/remove", {
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(payload),
    }).then(() => refetchJobQueue())
  }

  const handleRenderStart = () => {
    const newRenderId = nanoid()

    const formData = new FormData()

    const payload = {
      jobId: newRenderId,
      parameters: { ...stateToJson(getValues()), name_docarray: newRenderId },
    }

    formData.append("data", JSON.stringify(payload))
    if (file) formData.append("file", file)

    fetch("/api/create", {
      method: "POST",
      body: formData,
    }).then(() => refetchJobQueue())
  }

  const handlePromptAdd = () => {
    append({
      prompt: "",
      weight: 1,
    })
  }

  const handlePromptRemove = (index) => () => remove(index)

  useEffect(() => {
    console.log(window.innerWidth)
    const newWidth = window.innerWidth > 800 ? 800 : window.innerWidth
    console.log(newWidth)
    setPreviewWidth(newWidth)
  }, [])

  console.log(progressData)

  return (
    <Container maxWidth="xl">
      <Box sx={{ width: "100%", height: 75 }}></Box>
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h5">Prompt</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            {fields.map((field, index) => {
              const weight = `text_prompts.${index}.weight`
              const prompt = `text_prompts.${index}.prompt`

              return (
                <Stack direction="row" alignItems="center" spacing={2} key={field.id}>
                  <IconButton onClick={handlePromptRemove(index)}>
                    <CloseIcon></CloseIcon>
                  </IconButton>
                  <Box width="100px">
                    <ControlledTextField control={control} name={weight} label="Weight" />
                  </Box>
                  <ControlledTextField control={control} name={prompt} label="Prompt" />
                </Stack>
              )
            })}
            <Button
              sx={{
                width: "200px",
              }}
              variant="outlined"
              onClick={handlePromptAdd}
              startIcon={<AddIcon></AddIcon>}
            >
              Add Prompt
            </Button>
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h5">Model Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Grid container spacing={1}>
                {clipModels?.map((option, index) => {
                  return (
                    <Grid item key={option}>
                      <Chip
                        key={option}
                        variant="outlined"
                        label={option}
                        onDelete={() => removeClipModel(index)}
                      />
                    </Grid>
                  )
                })}
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                key={refreshModelAutocomplete}
                options={inputConfig?.["clip_models"]?.options?.filter(
                  (option) => !clipModels?.includes(option)
                )}
                disableCloseOnSelect={true}
                onChange={(e, data) => {
                  appendClipModel(data)
                }}
                onBlur={() => setRefreshModelAutocomplete(!refreshModelAutocomplete)}
                renderInput={(params) => (
                  <TextField label={"Add Clip Models"} {...params} size="small" />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <DynamicInput control={control} name={"diffusion_model"} />
            </Grid>
            <Grid item xs={12} md={3}>
              <DynamicInput control={control} name={"diffusion_sampling_mode"} />
            </Grid>
            <Grid item xs={12} md={3}>
              <DynamicInput control={control} name={"use_secondary_model"} />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h5">Run Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4} md={3}>
              <DynamicInput control={control} name={"seed"} />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <DynamicInput control={control} name={"batch_name"} />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <DynamicInput control={control} name={"batch_size"} />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <DynamicInput control={control} name={"n_batches"} />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <DynamicInput control={control} name={"steps"} />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <DynamicInput control={control} name={"width"} />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <DynamicInput control={control} name={"height"} />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <DynamicInput control={control} name={"skip_steps"} />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <Stack spacing={2}>
                {file ? (
                  <Stack
                    spacing={2}
                    sx={{
                      borderRadius: 5,
                    }}
                  >
                    <img src={initImagePreview} />
                    <Button
                      onClick={() => {
                        setFile(null)
                        setInitImagePreview(null)
                      }}
                      variant="outlined"
                    >
                      Remove Init Image
                    </Button>
                  </Stack>
                ) : (
                  <Card
                    {...getRootProps()}
                    sx={{
                      cursor: "pointer",
                      p: 3,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <input {...getInputProps()} />
                    {isDragActive ? (
                      <Typography>Drop File Here</Typography>
                    ) : (
                      <Typography>Drop Init Image Here or Click to Select</Typography>
                    )}
                  </Card>
                )}
              </Stack>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h5">Symmetry Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4} md={3}>
              <DynamicInput control={control} name={"use_vertical_symmetry"} />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <DynamicInput control={control} name={"use_horizontal_symmetry"} />
            </Grid>
          </Grid>
          <Grid mt={2} container spacing={2}>
            <Grid item xs={12} sm={4} md={3}>
              <DynamicInput control={control} name={"transformation_percent"} />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h5">Clip Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4} md={3} lg={2}>
              <DynamicInput control={control} name={"cutn_batches"} />
            </Grid>
            <Grid item xs={12} sm={4} md={3} lg={2}>
              <DynamicInput control={control} name={"clip_guidance_scale"} />
            </Grid>
          </Grid>
          <Grid mt={2} container spacing={2}>
            <Grid item xs={12} sm={4} md={3}>
              <DynamicInput control={control} name={"cut_ic_pow"} />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <DynamicInput control={control} name={"cut_overview"} />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <DynamicInput control={control} name={"cut_innercut"} />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <DynamicInput control={control} name={"cut_icgray_p"} />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h5">Miscellaneous Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4} md={3}>
              <DynamicInput control={control} name={"eta"} />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <DynamicInput control={control} name={"clamp_max"} />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <DynamicInput control={control} name={"rand_mag"} />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <DynamicInput control={control} name={"tv_scale"} />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <DynamicInput control={control} name={"range_scale"} />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <DynamicInput control={control} name={"sat_scale"} />
            </Grid>
          </Grid>
          <Grid container spacing={2} mt={2}>
            <Grid item xs={12} sm={4} md={3}>
              <DynamicInput control={control} name={"clamp_grad"} />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <DynamicInput control={control} name={"clip_denoised"} />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <DynamicInput control={control} name={"skip_augs"} />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
      <Stack sx={{ mt: 3 }} direction="row" justifyContent="space-between">
        <Stack direction="row" spacing={2}>
          <Button variant="contained" onClick={handleRenderStart}>
            Queue Render
          </Button>
        </Stack>

        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={openImportModal}>
            Import Settings
          </Button>
          <Button variant="outlined" onClick={handleExport}>
            Export Settings
          </Button>
        </Stack>
      </Stack>
      {progressData?.progress && (
        <Grid container justifyContent="center" mt={3} mb={10}>
          <Carousel
            width={previewWidth}
            infiniteLoop
            renderThumbs={() => {
              return progressData?.progress
                ?.filter(({ latestImage }) => latestImage)
                ?.map(({ latestImage, dimensions }) => (
                  <Image
                    key={latestImage}
                    {...getThumbnailDimensions(dimensions)}
                    src={latestImage}
                  ></Image>
                ))
            }}
          >
            {progressData?.progress
              ?.filter(({ latestImage }) => latestImage)
              ?.map(({ latestImage, dimensions, frame, config, batchNumber }) => (
                <Stack alignItems="center" spacing={1} key={latestImage}>
                  {latestImage ? (
                    <>
                      <LinearProgress
                        sx={{
                          borderRadius: 5,
                          width: previewWidth * 0.8,
                          height: 20,
                        }}
                        variant="determinate"
                        value={(frame / config?.steps) * 100}
                      />
                      <LinearProgress
                        sx={{
                          borderRadius: 5,
                          width: previewWidth * 0.8,
                          height: 20,
                        }}
                        variant="determinate"
                        value={(batchNumber / config?.n_batches) * 100}
                      />
                      <Box>
                        <Image
                          alt=""
                          {...getThumbnailDimensions({
                            ...dimensions,
                            maxWidth: previewWidth,
                          })}
                          src={latestImage}
                        />
                      </Box>
                    </>
                  ) : (
                    <Stack alignItems="center" spacing={2}>
                      <Typography>Initializing Job</Typography>
                      <CircularProgress></CircularProgress>
                    </Stack>
                  )}
                </Stack>
              ))}
          </Carousel>
        </Grid>
      )}
      <Stack mt={4} spacing={2} sx={{ height: 600 }}>
        <Stack direction="row" justifyContent="space-between" px={2}>
          <Typography variant="h4">Generation Queue</Typography>
          <Box
            sx={{
              py: 1,
              px: 3,
              border: `1px solid ${theme.colors.primary.main}`,
              borderRadius: 5,
            }}
          >
            <FormControlLabel
              color="info"
              label="Show Finished"
              control={
                <Switch checked={showAllJobs} onClick={() => setShowAllJobs(!showAllJobs)}></Switch>
              }
            />
          </Box>
        </Stack>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell align="left">Created</TableCell>
              <TableCell align="left">Started</TableCell>
              <TableCell align="right">Status</TableCell>
              <TableCell align="right"></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobData?.jobs
              ?.filter(({ completed_at }) => {
                if (showAllJobs) return true
                else return !completed_at
              })
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              ?.map((job) => (
                <QueueEntry
                  key={job.job_id}
                  job={job}
                  handleQueueRemove={handleQueueRemove}
                  handleImport={handleImport}
                ></QueueEntry>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={
            jobData?.jobs?.filter(({ completed_at }) => {
              if (showAllJobs) return true
              else return !completed_at
            })?.length || 0
          }
          page={page}
          onPageChange={handleChangePage}
          rowsPerPageOptions={[5, 10, 20]}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Stack>
      <Box sx={{ width: "100%", height: 100 }}></Box>
      <Dialog fullWidth maxWidth="lg" open={exportOpen} onClose={closeExportModal}>
        <DialogContent>
          {<TextField fullWidth multiline rows={30} readOnly value={exportedJson} />}
        </DialogContent>
        <DialogActions>
          <Button variant="ghost" mr={3} onClick={closeExportModal}>
            Close
          </Button>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(exportedJson)
            }}
            variant="contained"
          >
            Copy To Clipboard
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog fullWidth maxWidth="lg" open={importOpen} onClose={closeImportModal}>
        <DialogContent>
          <TextField
            fullWidth
            value={jsonToImport}
            onChange={(e) => setJsonToImport(e?.target?.value)}
            multiline
            rows={30}
          />
        </DialogContent>

        <DialogActions>
          <Stack direction="row" width="100%" alignItems="center" justifyContent="space-between">
            {jsonValidationError && (
              <Box sx={{ pl: 3 }}>
                <Typography variant="h5" color="red">
                  {jsonValidationError}
                </Typography>
              </Box>
            )}
            <Box>
              <Button variant="ghost" mr={3} onClick={closeImportModal}>
                Close
              </Button>
              <Button onClick={handleImport()} variant="contained">
                Import
              </Button>
            </Box>
          </Stack>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
