<template>
  <AutoComplete
    :df="languageDf"
    :value="value"
    :border="true"
    input-class="rounded py-1.5"
    @change="onChange"
  />
</template>
<script setup lang="ts">
import { computed } from "vue";
import { DEFAULT_LANGUAGE } from "fyo/utils/consts";
import { OptionField } from "schemas/types";
import { t } from "fyo";
import { fyo } from "src/initFyo";
import { languageCodeMap, setLanguageMap } from "src/utils/language";
import AutoComplete from "./AutoComplete.vue";

const props = defineProps({
  dontReload: {
    type: Boolean,
    default: false,
  },
});

const value = computed(() => {
  return fyo.config.get("language") ?? DEFAULT_LANGUAGE;
});

const languageDf = computed<OptionField>(() => {
  const preset = fyo.config.get("language");
  let language = DEFAULT_LANGUAGE;
  if (typeof preset === "string") {
    language = preset;
  }

  return {
    fieldname: "language",
    label: t`Language`,
    fieldtype: "AutoComplete",
    options: Object.keys(languageCodeMap).map((value) => ({
      label: value,
      value,
    })),
    default: language,
    description: t`Set the display language.`,
  };
});

function onChange(val: unknown) {
  if (typeof val !== "string") {
    return;
  }

  if (languageCodeMap[val] === undefined) {
    return;
  }

  setLanguageMap(val, props.dontReload);
}
</script>
