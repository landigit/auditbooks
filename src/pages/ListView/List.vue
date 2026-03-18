<template>
  <div class="text-base flex flex-col overflow-hidden h-full">
    <div
      class="flex-1 overflow-auto rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-875 custom-scroll custom-scroll-thumb1"
    >
      <Table>
        <TableHeader
          class="sticky top-0 bg-white dark:bg-gray-875 z-10 border-b border-gray-200 dark:border-gray-800"
        >
          <TableRow class="hover:bg-transparent">
            <TableHead
              v-if="!isSelectionMode"
              class="w-12 text-center text-foreground/60 font-semibold tracking-normal normal-case text-[10px]"
              >#</TableHead
            >
            <TableHead v-else class="w-12 text-center">
              <Check
                :df="{ fieldtype: 'Check', fieldname: 'selectAll', label: '' }"
                :show-label="false"
                :value="isAllSelected"
                @change="toggleSelectAll"
              />
            </TableHead>
            <TableHead
              v-for="(column, i) in columns"
              :key="column.label"
              class="text-foreground/60 font-semibold tracking-normal normal-case text-[10px]"
              :class="{
                'text-right': isNumeric(column.fieldtype),
                'pr-6': i === columns.length - 1,
              }"
            >
              {{ column.label }}
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          <template v-if="dataSlice.length !== 0">
            <TableRow
              v-for="(row, i) in dataSlice"
              :key="row.name as string"
              class="cursor-pointer group hover:bg-white/5 transition-colors"
              @click="isSelectionMode ? null : $emit('openDoc', row.name)"
            >
              <TableCell
                v-if="!isSelectionMode"
                class="w-12 text-center text-muted-foreground font-semibold"
              >
                {{ i + pageStart + 1 }}
              </TableCell>
              <TableCell v-else class="w-12 text-center py-2" @click.stop>
                <div class="flex justify-center">
                  <Check
                    :df="{
                      fieldtype: 'Check',
                      fieldname: 'selectItem',
                      label: '',
                    }"
                    :show-label="false"
                    :value="selectedItems.includes(row.name as string)"
                    @change="toggleItemSelection(row.name as string)"
                  />
                </div>
              </TableCell>

              <TableCell
                v-for="(column, c) in columns"
                :key="column.label"
                class="py-3 items-center"
                :class="{
                  'text-right': isNumeric(column.fieldtype),
                  'pr-6': c === columns.length - 1,
                }"
              >
                <ListCell
                  :row="row as RenderData"
                  :column="column"
                  @status-found="handleStatusFound"
                />
              </TableCell>
            </TableRow>
          </template>

          <template v-else>
            <TableRow class="hover:bg-transparent border-0">
              <TableCell
                :colspan="columns.length + 1"
                class="h-[400px] text-center"
              >
                <div
                  class="flex flex-col items-center justify-center opacity-70"
                >
                  <div
                    class="w-20 h-20 rounded-[2rem] bg-white/5 flex items-center justify-center border border-gray-100 dark:border-gray-800 shadow-inner mb-6"
                  >
                    <LucideIcon
                      name="inbox"
                      class="text-muted-foreground w-10 h-10"
                    />
                  </div>
                  <span
                    class="text-xs normal-case tracking-[0.25em] font-semibold text-muted-foreground mb-6"
                  >
                    {{ t`No entries found` }}
                  </span>
                  <UIButton
                    v-if="canCreate"
                    variant="default"
                    @click="$emit('makeNewDoc')"
                  >
                    <LucideIcon name="plus" class="w-4 h-4 mr-2" />
                    {{ t`Make Entry` }}
                  </UIButton>
                </div>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </div>

    <!-- Pagination Footer -->
    <div v-if="data?.length" class="mt-4 flex justify-end px-2">
      <Paginator :item-count="data.length" @index-change="setPageIndices" />
    </div>
  </div>
</template>
<script lang="ts">
import { ListViewSettings, RenderData } from 'fyo/model/types';
import { cloneDeep } from 'lodash';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from 'src/components/ui';
import LucideIcon from 'src/components/LucideIcon.vue';
import Check from 'src/components/Controls/Check.vue';
import Paginator from 'src/components/Paginator.vue';
import { fyo } from 'src/initFyo';
import { isNumeric } from 'src/utils';
import { QueryFilter } from 'utils/db/types';
import { PropType, defineComponent, toRaw } from 'vue';
import ListCell from './ListCell.vue';

export default defineComponent({
  name: 'List',
  components: {
    ListCell,
    Check,
    Paginator,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    LucideIcon,
  },
  props: {
    listConfig: {
      type: Object as PropType<ListViewSettings | undefined>,
      default: () => ({ columns: [] }),
    },
    filters: {
      type: Object as PropType<QueryFilter>,
      default: () => ({}),
    },
    schemaName: { type: String, required: true },
    canCreate: Boolean,
    isSelectionMode: Boolean,
  },
  emits: ['openDoc', 'makeNewDoc', 'updatedData', 'selected-items-changed'],
  data() {
    return {
      data: [] as RenderData[],
      pageStart: 0,
      pageEnd: 0,
      statusMap: {} as Record<string, string>,
      selectedItems: [] as string[],
    };
  },
  computed: {
    dataSlice() {
      return this.data.slice(this.pageStart, this.pageEnd);
    },
    count() {
      return this.pageEnd - this.pageStart + 1;
    },
    isAllSelected(): boolean {
      return (
        this.data.length > 0 && this.selectedItems.length === this.data.length
      );
    },
    columns() {
      let columns = this.listConfig?.columns ?? [];

      if (columns.length === 0) {
        columns = fyo.schemaMap[this.schemaName]?.quickEditFields ?? [];
        columns = [...new Set(['name', ...columns])];
      }

      return columns
        .map((fieldname) => {
          if (typeof fieldname === 'object') {
            return fieldname;
          }

          return fyo.getField(this.schemaName, fieldname);
        })
        .filter(Boolean);
    },
  },
  watch: {
    async schemaName(oldValue, newValue) {
      if (oldValue === newValue) {
        return;
      }

      await this.updateData();
    },
  },
  async mounted() {
    await this.updateData();
    this.setUpdateListeners();
  },
  methods: {
    handleStatusFound({ rowId, status }: { rowId: string; status: string }) {
      this.statusMap[rowId] = status;
    },
    isNumeric,
    setPageIndices({ start, end }: { start: number; end: number }) {
      this.pageStart = start;
      this.pageEnd = end;
    },
    setUpdateListeners() {
      if (!this.schemaName) {
        return;
      }

      const listener = async () => {
        await this.updateData();
      };

      if (fyo.schemaMap[this.schemaName]?.isSubmittable) {
        fyo.doc.observer.on(`submit:${this.schemaName}`, listener);
        fyo.doc.observer.on(`revert:${this.schemaName}`, listener);
      }

      fyo.doc.observer.on(`sync:${this.schemaName}`, listener);
      fyo.db.observer.on(`delete:${this.schemaName}`, listener);
      fyo.doc.observer.on(`rename:${this.schemaName}`, listener);
    },
    async updateData(filters?: Record<string, unknown>) {
      const baseFilters = cloneDeep(toRaw(this.filters));
      filters = cloneDeep({ ...baseFilters, ...filters });

      let statusFilter: [string, string] | undefined;

      if ('status' in filters) {
        statusFilter = filters['status'] as [string, string];
      }

      const isStatusFilter =
        Array.isArray(statusFilter) && statusFilter[0] === 'like';
      if (isStatusFilter) {
        delete filters['status'];
      }

      const orderBy = ['created'];
      if (fyo.db.fieldMap[this.schemaName]['date']) {
        orderBy.unshift('date');
      }

      const tableData = await fyo.db.getAll(this.schemaName, {
        fields: ['*'],
        filters: filters as QueryFilter,
        orderBy,
      });

      let filteredData = tableData;

      if (isStatusFilter && statusFilter?.[1]) {
        const lowercaseStatus = String(statusFilter[1]).toLowerCase();

        const matchedNames = Object.entries(this.statusMap)
          .filter((entry) => entry[1].toLowerCase() === lowercaseStatus)
          .map((entry) => entry[0]);

        filteredData = tableData.filter((row) =>
          matchedNames.includes(String(row.name))
        );
      }

      this.data = filteredData.map((d) => ({
        ...d,
        schema: fyo.schemaMap[this.schemaName],
      })) as RenderData[];
      this.$emit('updatedData', filters);
    },
    toggleItemSelection(itemName: string) {
      const index = this.selectedItems.indexOf(itemName);
      if (index > -1) {
        this.selectedItems.splice(index, 1);
      } else {
        this.selectedItems.push(itemName);
      }
      this.$emit('selected-items-changed', this.selectedItems);
    },
    toggleSelectAll(checked: boolean) {
      this.selectedItems = checked
        ? this.data.map((row) => row.name as string)
        : [];
      this.$emit('selected-items-changed', this.selectedItems);
    },
  },
});
</script>
