<template>
  <Badge v-if="showStatus" variant="outline" :class="cn('px-2.5 py-0.5 text-[10px] tracking-normal normal-case font-semibold border-none', customClass)">
    {{ text }}
  </Badge>
</template>
<script lang="ts">
import { Doc } from 'fyo/model/doc';
import { isPesa } from 'fyo/utils';
import { Invoice } from 'models/baseModels/Invoice/Invoice';
import { Party } from 'models/baseModels/Party/Party';
import { LoyaltyProgram } from 'models/baseModels/LoyaltyProgram/LoyaltyProgram';
import { ModelNameEnum } from 'models/types';
import { Money } from 'pesa';
import { defineComponent } from 'vue';
import { cn } from 'src/lib/utils';

type Status = ReturnType<typeof getStatus>;
type UIColors = 'gray' | 'orange' | 'red' | 'green' | 'blue' | 'yellow';

export default defineComponent({
  components: {},
  props: { doc: { type: Doc, required: true } },
  setup() {
    return { cn };
  },
  data() {
    return {
      showStatus: true,
    };
  },
  computed: {
    customClass(): string {
      const map: Record<UIColors, string> = {
        gray: 'bg-white/10 text-foreground/70',
        orange: 'bg-orange-500/20 text-orange-400',
        red: 'bg-red-500/20 text-red-400',
        green: 'bg-emerald-500/20 text-emerald-400',
        blue: 'bg-blue-500/20 text-blue-400',
        yellow: 'bg-amber-500/20 text-amber-500',
      };
      return map[this.color] || map.gray;
    },
    status(): Status {
      return getStatus(this.doc);
    },
    text() {
      if (
        this.doc.schemaName === ModelNameEnum.SalesQuote &&
        this.doc.isSubmitted
      ) {
        this.showStatus = false;
      }

      const hasOutstanding = isPesa(this.doc.outstandingAmount);

      if (hasOutstanding && this.status === 'Unpaid') {
        const amt = this.fyo.format(this.doc.outstandingAmount, 'Currency');
        return this.t`Unpaid ${amt}`;
      }

      if (hasOutstanding && this.status === 'PartlyPaid') {
        const outstandingPayment = this.fyo.format(
          (this.doc.grandTotal as Money).sub(
            this.doc.outstandingAmount as Money
          ),
          'Currency'
        );
        return this.t`Partly Paid ${outstandingPayment}`;
      }

      if (this.status === 'Outstanding') {
        const outstandingPayment = this.fyo.format(
          this.doc.outstandingAmount as Money,
          'Currency'
        );
        return this.t`Unpaid ${outstandingPayment}`;
      }

      return {
        Draft: this.t`Draft`,
        Cancelled: this.t`Cancelled`,
        Outstanding: this.t`Outstanding`,
        NotTransferred: this.t`Not Transferred`,
        NotSaved: this.t`Not Saved`,
        NotSubmitted: this.t`Not Submitted`,
        Paid: this.t`Paid`,
        Saved: this.t`Saved`,
        Submitted: this.t`Submitted`,
        Return: this.t`Return`,
        ReturnIssued: this.t`Return Issued`,
        Unpaid: this.t`Unpaid`,
        PartlyPaid: this.t`Partly Paid`,
        Expired: this.t`Expired`,
        Active: this.t`Active`,
        Maxed: this.t`Maxed`,
      }[this.status];
    },
    color(): UIColors {
      return statusColorMap[this.status];
    },
  },
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

  if (doc instanceof LoyaltyProgram) {
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

  if (doc instanceof Party && doc.outstandingAmount?.isZero() !== true) {
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

  const isInvoice = doc instanceof Invoice;

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
