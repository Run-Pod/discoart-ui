import { getRandomSeed, inputConfig } from "@components/DiscoInput/discoParameterConfig"
import { compose, identity, omit, pick } from "ramda"
import { parse } from "yaml"

const parseTextPrompts = (parsedJson) => {
  try {
    if (!parsedJson) return []
    if (typeof parsedJson === "string")
      return {
        prompt: parsedJson,
        weight,
      }
    else
      return parsedJson.map((prompt) => {
        const [text, weight = 1] = prompt?.split(":")
        return {
          prompt: text,
          weight,
        }
      })
  } catch (e) {
    console.log(e)
    return [
      {
        prompt: "Unable to import text prompt",
        weight: 1,
      },
    ]
  }
}

const stringifyTextPrompts = (inputState) =>
  inputState.map(({ prompt, weight }) => `${prompt}:${weight}`)

const stringifyDimensions = (height, width) => [width, height]
const parseDimensions = (dimensions) => {
  if (!dimensions) return { width: 1280, height: 768 }
  return {
    width: dimensions[0],
    height: dimensions[1],
  }
}

const parseCudaDevice = (string) => {
  if (!string) return "cuda:0"
  const [, index] = string?.split(":")

  return index?.trim()
}

const stringifyCudaDevice = (index) => `cuda:${index}`

export const stateToJson = (state, shouldFilter) => {
  // TODO: add more special parsers to make UX better

  const jsonObject = compose(
    omit(["width", "height"]),
    shouldFilter ? pick([...Object.keys(inputConfig), "width_height"]) : identity,
    (state) => {
      return {
        ...state,
        text_prompts: stringifyTextPrompts(state.text_prompts),
        width_height: stringifyDimensions(state.height, state.width),
        seed: state?.seed || getRandomSeed(),
        // cuda_device: stringifyCudaDevice(state?.cuda_device),
      }
    },
    (state) => {
      let mappedState = {}
      Object.entries(state).forEach(([key, value]) => {
        const fieldType = inputConfig?.[key]?.type
        if (fieldType === "integer") {
          mappedState[key] = parseInt(value)
        } else if (fieldType === "float") {
          mappedState[key] = parseFloat(value)
        } else if (fieldType === "string") {
          mappedState[key] = value || null
        } else if (fieldType === "array") {
          mappedState[key] = JSON.parse(value) || null
        } else {
          mappedState[key] = value
        }
      })
      return mappedState
    }
  )(state)

  return jsonObject
}

// TODO: add more validations here
export const jsonToState = (json) => {
  const parsedState = compose(
    pick(Object.keys(inputConfig)),
    (parsed) => {
      const { height, width } = parseDimensions(parsed?.width_height)

      const clipModels = parsed?.clip_models

      return {
        ...parsed,
        text_prompts: parseTextPrompts(parsed?.text_prompts),
        // cuda_device: parseCudaDevice(parsed?.cuda_device),
        transformation_percent: JSON.stringify(parsed?.transformation_percent),
        clip_models: clipModels || inputConfig.clip_models.default,
        width,
        height,
      }
    },
    parse
  )(json)

  return parsedState
}
