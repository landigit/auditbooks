<template>
  <text v-if="showStatus" class="pill font-medium" :class="styleClass">
    {{ text }}
  </text>
</template>

<script setup lang="ts">
// --- Imports ---
import { computed } from "vue";
import { Doc } from "fyo/model/doc";
import { isPesa } from "fyo/utils";
import { Invoice } from "models/baseModels/Invoice/Invoice";
import { Party } from "models/baseModels/Party/Party";
import { LoyaltyProgram } from "models/baseModels/LoyaltyProgram/LoyaltyProgram";
import { ModelNameEnum } from "models/types";
import { Money } from "pesa";
import { getBgTextColorClass } from "src/utils/colors";
import { fyo } from "src/initFyo";
import { t } from "fyo";

// --- Types ---
type Status = ReturnType<typeof getStatus>;
type UIColors = "gray" | "orange" | "red" | "green" | "blue" | "yellow";

// --- Props & Emits ---
const props = defineProps<{
  doc: Doc;
}>();

// --- Computed ---
const showStatus = computed(() => {
  if (
    props.doc.schemaName === ModelNameEnum.SalesQuote &&
    props.doc.isSubmitted
  ) {
    return false;
  }
  return true;
});

const status = computed<Status>(() => {
  return getStatus(props.doc);
});

const styleClass = computed<string>(() => {
  return getBgTextColorClass(color.value);
});

const text = computed(() => {
  const hasOutstanding = isPesa(props.doc.outstandingAmount);

  if (hasOutstanding && status.value === "Unpaid") {
    const amt = fyo.format(props.doc.outstandingAmount as Money, "Currency");
    return t`Unpaid ${amt}`;
  }

  if (hasOutstanding && status.value === "PartlyPaid") {
    const outstandingPayment = fyo.format(
      (props.doc.grandTotal as Money).sub(props.doc.outstandingAmount as Money),
      "Currency",
    );
    return t`Partly Paid ${outstandingPayment}`;
  }

  if (status.value === "Outstanding") {
    const outstandingPayment = fyo.format(
      props.doc.outstandingAmount as Money,
      "Currency",
    );
    return t`Unpaid ${outstandingPayment}`;
  }

  return {
    Draft: t`Draft`,
    Cancelled: t`Cancelled`,
    Outstanding: t`Outstanding`,
    NotTransferred: t`Not Transferred`,
    NotSaved: t`Not Saved`,
    NotSubmitted: t`Not Submitted`,
    Paid: t`Paid`,
    Saved: t`Saved`,
    Submitted: t`Submitted`,
    Return: t`Return`,
    ReturnIssued: t`Return Issued`,
    Unpaid: t`Unpaid`,
    PartlyPaid: t`Partly Paid`,
    Expired: t`Expired`,
    Active: t`Active`,
    Maxed: t`Maxed`,
  }[status.value];
});

const color = computed<UIColors>(() => {
  return statusColorMap[status.value];
});

// --- Constants ---
const statusColorMap: Record<Status, UIColors> = {
  Draft: "gray",
  Cancelled: "red",
  Outstanding: "orange",
  NotTransferred: "orange",
  NotSaved: "orange",
  NotSubmitted: "orange",
  Paid: "green",
  Saved: "blue",
  Submitted: "blue",
  Return: "gray",
  ReturnIssued: "gray",
  Unpaid: "red",
  PartlyPaid: "yellow",
  Expired: "red",
  Active: "green",
  Maxed: "orange",
};

// --- Methods ---
function getStatus(doc: Doc) {
  if (doc.notInserted) {
    return "Draft";
  }

  if (doc.dirty) {
    return "NotSaved";
  }

  if (doc instanceof LoyaltyProgram) {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const maximumUse = doc.maximumUse as number;
    const used = doc.used as number;

    if (maximumUse > 0 && used >= maximumUse) {
      return "Maxed";
    }

    if (doc.toDate && doc.toDate instanceof Date) {
      const toDate = new Date(doc.toDate);
      toDate.setHours(0, 0, 0, 0);
      if (toDate <= currentDate) {
        return "Expired";
      }
    }
    return "Active";
  }

  if (doc instanceof Party && doc.outstandingAmount?.isZero() !== true) {
    return "Outstanding";
  }

  if (doc.schema.isSubmittable) {
    return getSubmittableStatus(doc);
  }

  return "Saved";
}

function getSubmittableStatus(doc: Doc) {
  if (doc.isCancelled) {
    return "Cancelled";
  }

  if (doc.returnAgainst && doc.isSubmitted) {
    return "Return";
  }

  if (doc.isReturned && doc.isSubmitted) {
    return "ReturnIssued";
  }

  const isInvoice = doc instanceof Invoice;

  if (doc.isSubmitted && isInvoice && (doc.stockNotTransferred ?? 0) > 0) {
    return "NotTransferred";
  }

  if (
    doc.isSubmitted &&
    isInvoice &&
    doc.outstandingAmount?.isZero() === true
  ) {
    return "Paid";
  }

  if (
    doc.isSubmitted &&
    isInvoice &&
    !doc.isCancelled &&
    (doc.outstandingAmount as Money)?.isPositive() &&
    (doc.outstandingAmount as Money)?.neq(doc.grandTotal as Money)
  ) {
    return "PartlyPaid";
  }

  if (
    doc.isSubmitted &&
    isInvoice &&
    !doc.isCancelled &&
    (doc.outstandingAmount as Money)?.eq(doc.grandTotal as Money)
  ) {
    return "Unpaid";
  }

  if (
    doc.isSubmitted &&
    isInvoice &&
    doc.outstandingAmount?.isZero() !== true
  ) {
    return "Outstanding";
  }

  if (doc.isSubmitted) {
    return "Submitted";
  }

  return "NotSubmitted";
}
</script>
