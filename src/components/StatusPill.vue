<template>
  <p v-if="showStatus" class="pill font-medium" :class="styleClass">
    {{ text }}
  </p>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { Doc } from 'fyo/model/doc';
import { isPesa } from 'fyo/utils';
import { ModelNameEnum } from 'models/types';
import { Money } from 'pesa';
import { getBgTextColorClass } from 'src/utils/colors';
import { useApp } from 'src/composables/useApp';

type Status = ReturnType<typeof getStatus>;
type UIColors = 'gray' | 'orange' | 'red' | 'green' | 'blue' | 'yellow';

const { t, fyo } = useApp();

const props = defineProps<{ doc: Doc }>();

const status = computed<Status>(() => {
  return getStatus(props.doc);
});

const showStatus = computed(() => {
  if (props.doc.schemaName === ModelNameEnum.SalesQuote && props.doc.isSubmitted) {
    return false;
  }
  return true;
});

const styleClass = computed<string>(() => {
  return getBgTextColorClass(color.value);
});

const color = computed<UIColors>(() => {
  return statusColorMap[status.value];
});

const text = computed(() => {
  const hasOutstanding = isPesa(props.doc.outstandingAmount);

  if (hasOutstanding && status.value === 'Unpaid') {
    const amt = fyo.format(props.doc.outstandingAmount, 'Currency');
    return t`Unpaid ${amt}`;
  }

  if (hasOutstanding && status.value === 'PartlyPaid') {
    const outstandingPayment = fyo.format(
      (props.doc.grandTotal as Money).sub(
        props.doc.outstandingAmount as Money
      ),
      'Currency'
    );
    return t`Partly Paid ${outstandingPayment}`;
  }

  if (status.value === 'Outstanding') {
    const outstandingPayment = fyo.format(
      props.doc.outstandingAmount as Money,
      'Currency'
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

const statusColorMap: Record<Status, UIColors> = {
  Draft: 'gray',
  Cancelled: 'red',
  Outstanding: 'orange',
  NotTransferred: 'orange',
  NotSaved: 'orange',
  NotSubmitted: 'orange',
  Paid: 'green',
  Saved: 'blue',
  Submitted: 'blue',
  Return: 'gray',
  ReturnIssued: 'gray',
  Unpaid: 'red',
  PartlyPaid: 'yellow',
  Expired: 'red',
  Active: 'green',
  Maxed: 'orange',
};

function getStatus(doc: Doc) {
  if (doc.notInserted) {
    return 'Draft';
  }

  if (doc.dirty) {
    return 'NotSaved';
  }

  if (doc.schemaName === ModelNameEnum.LoyaltyProgram) {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const maximumUse = doc.maximumUse as number;
    const used = doc.used as number;

    if (maximumUse > 0 && used >= maximumUse) {
      return 'Maxed';
    }

    if (doc.toDate && doc.toDate instanceof Date) {
      const toDate = new Date(doc.toDate);
      toDate.setHours(0, 0, 0, 0);
      if (toDate <= currentDate) {
        return 'Expired';
      }
    }
    return 'Active';
  }

  if (doc.schemaName === ModelNameEnum.Party && doc.outstandingAmount?.isZero() !== true) {
    return 'Outstanding';
  }

  if (doc.schema.isSubmittable) {
    return getSubmittableStatus(doc);
  }

  return 'Saved';
}

function getSubmittableStatus(doc: Doc) {
  if (doc.isCancelled) {
    return 'Cancelled';
  }

  if (doc.returnAgainst && doc.isSubmitted) {
    return 'Return';
  }

  if (doc.isReturned && doc.isSubmitted) {
    return 'ReturnIssued';
  }

  const isInvoice = [ModelNameEnum.SalesInvoice, ModelNameEnum.PurchaseInvoice].includes(doc.schemaName as ModelNameEnum);

  if (doc.isSubmitted && isInvoice && (doc.stockNotTransferred ?? 0) > 0) {
    return 'NotTransferred';
  }

  if (
    doc.isSubmitted &&
    isInvoice &&
    doc.outstandingAmount?.isZero() === true
  ) {
    return 'Paid';
  }

  if (
    doc.isSubmitted &&
    isInvoice &&
    !doc.isCancelled &&
    (doc.outstandingAmount as Money)?.isPositive() &&
    (doc.outstandingAmount as Money)?.neq(doc.grandTotal as Money)
  ) {
    return 'PartlyPaid';
  }

  if (
    doc.isSubmitted &&
    isInvoice &&
    !doc.isCancelled &&
    (doc.outstandingAmount as Money)?.eq(doc.grandTotal as Money)
  ) {
    return 'Unpaid';
  }

  if (
    doc.isSubmitted &&
    isInvoice &&
    doc.outstandingAmount?.isZero() !== true
  ) {
    return 'Outstanding';
  }

  if (doc.isSubmitted) {
    return 'Submitted';
  }

  return 'NotSubmitted';
}
</script>
