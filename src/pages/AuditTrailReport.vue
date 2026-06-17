<template>
  <div class="flex flex-col w-full h-full overflow-hidden text-foreground">
    <!-- Header -->
    <PageHeader :title="t`Audit Trail`">
      <template #left>
        <span
          class="text-xs text-muted-foreground hidden lg:inline-block border-s border-gray-200 dark:border-gray-800 pl-4 ml-2"
        >
          {{ t`Tamper-evident log · ISO 27001 · IT Act 2000 (India)` }}
        </span>
      </template>
      <div class="flex items-center gap-2">
        <Button :disabled="loading" @click="exportCsv">
          <FeatherIcon name="download" class="w-4 h-4 mr-1.5" />
          {{ t`Export CSV` }}
        </Button>
        <Button :disabled="loading" @click="printReport">
          <FeatherIcon name="printer" class="w-4 h-4 mr-1.5" />
          {{ t`Print` }}
        </Button>
        <Button type="primary" :disabled="loading" @click="loadLogs">
          <FeatherIcon
            name="rotate-cw"
            class="w-4 h-4 mr-1.5"
            :class="{ 'animate-spin': loading }"
          />
          {{ t`Refresh` }}
        </Button>
      </div>
    </PageHeader>

    <!-- Stats Bar -->
    <div
      class="grid grid-cols-2 md:grid-cols-5 border-b border-gray-200 dark:border-gray-800 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-800 flex-shrink-0"
    >
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="flex flex-col items-center justify-center py-2 px-4"
      >
        <span class="text-lg font-bold text-primary dark:text-blue-400">{{
          stat.value
        }}</span>
        <span
          class="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5 text-center"
          >{{ stat.label }}</span
        >
      </div>
    </div>

    <!-- Filters -->
    <div
      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2 p-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0"
    >
      <FormControl
        :df="fromDateDf"
        :border="true"
        size="small"
        :show-label="true"
        :value="filters.fromDate"
        @change="
          (v: any) => {
            filters.fromDate = v;
            onFilterChange();
          }
        "
      />
      <FormControl
        :df="toDateDf"
        :border="true"
        size="small"
        :show-label="true"
        :value="filters.toDate"
        @change="
          (v: any) => {
            filters.toDate = v;
            onFilterChange();
          }
        "
      />
      <FormControl
        :df="actionDf"
        :border="true"
        size="small"
        :show-label="true"
        :value="filters.action"
        @change="
          (v: any) => {
            filters.action = v;
            onFilterChange();
          }
        "
      />
      <FormControl
        :df="documentTypeDf"
        :border="true"
        size="small"
        :show-label="true"
        :value="filters.documentType"
        @change="
          (v: any) => {
            filters.documentType = v;
            onFilterChange();
          }
        "
      />
      <div class="flex items-end gap-2">
        <div class="flex-1">
          <FormControl
            :df="searchDf"
            :border="true"
            size="small"
            :show-label="true"
            :value="filters.search"
            @input="handleSearchInput"
          />
        </div>
        <Button class="h-8 mb-[1px]" type="secondary" @click="clearFilters">
          {{ t`Clear` }}
        </Button>
      </div>
    </div>

    <!-- Table Container -->
    <div
      class="text-base flex-1 overflow-y-auto overflow-x-hidden flex flex-col"
    >
      <div class="overflow-x-auto min-w-0 flex-1 flex flex-col">
        <!-- List Header Row -->
        <div class="flex items-center list-header-row px-4 min-w-max">
          <div class="w-8 text-start me-2 text-gray-700 dark:text-gray-400">
            #
          </div>
          <Row
            class="text-gray-700 dark:text-gray-400 h-row-mid w-full"
            :grid-template-columns="gridTemplateColumns"
            gap="0.5rem"
          >
            <div
              class="min-w-0 truncate h-full items-center justify-start flex select-none cursor-pointer hover:text-foreground transition-colors"
              @click="sortBy('timestamp')"
            >
              {{ t`Date & Time` }}
              <span class="ml-1 text-[10px]">{{ sortIcon('timestamp') }}</span>
            </div>
            <div
              class="min-w-0 truncate h-full items-center justify-start flex select-none cursor-pointer hover:text-foreground transition-colors"
              @click="sortBy('action')"
            >
              {{ t`Action` }}
              <span class="ml-1 text-[10px]">{{ sortIcon('action') }}</span>
            </div>
            <div
              class="min-w-0 truncate h-full items-center justify-start flex select-none cursor-pointer hover:text-foreground transition-colors"
              @click="sortBy('documentType')"
            >
              {{ t`Document Type` }}
              <span class="ml-1 text-[10px]">{{
                sortIcon('documentType')
              }}</span>
            </div>
            <div
              class="min-w-0 truncate h-full items-center justify-start flex select-none cursor-pointer hover:text-foreground transition-colors"
              @click="sortBy('documentName')"
            >
              {{ t`Document Name` }}
              <span class="ml-1 text-[10px]">{{
                sortIcon('documentName')
              }}</span>
            </div>
            <div
              class="min-w-0 truncate h-full items-center justify-start flex select-none cursor-pointer hover:text-foreground transition-colors"
              @click="sortBy('user')"
            >
              {{ t`User` }}
              <span class="ml-1 text-[10px]">{{ sortIcon('user') }}</span>
            </div>
          </Row>
        </div>
        <hr class="dark:border-gray-800" />

        <!-- Empty State -->
        <div
          v-if="filteredLogs.length === 0 && !loading"
          class="flex-1 flex flex-col items-center justify-center gap-3 min-h-[300px] text-muted-foreground p-6"
        >
          <FeatherIcon
            name="file"
            class="w-16 h-16 text-gray-500 dark:text-gray-400"
          />
          <p class="text-sm font-medium">
            {{ t`No audit records found for the selected filters.` }}
          </p>
          <Button type="secondary" @click="clearFilters">{{
            t`Clear Filters`
          }}</Button>
        </div>

        <!-- Loading State -->
        <div
          v-else-if="loading"
          class="flex-1 flex flex-col items-center justify-center gap-3 min-h-[300px] text-muted-foreground"
        >
          <div
            class="w-8 h-8 border-2 border-gray-200 border-t-primary rounded-full animate-spin"
          ></div>
          <span>{{ t`Loading audit records…` }}</span>
        </div>

        <!-- Data Rows -->
        <div v-else class="flex-1">
          <div v-for="(log, i) in paginatedLogs" :key="log.name">
            <div
              class="flex hover:bg-gray-50 dark:hover:bg-gray-850 items-center px-4 min-w-max"
            >
              <div class="w-8 text-start me-2 text-gray-700 dark:text-gray-400">
                {{ i + pageStart + 1 }}
              </div>
              <Row
                class="cursor-pointer text-gray-900 dark:text-gray-300 h-row-mid w-full"
                :grid-template-columns="gridTemplateColumns"
                gap="0.5rem"
                @click="openDetail(log)"
              >
                <!-- Date & Time -->
                <div
                  class="min-w-0 truncate h-full items-center justify-start flex"
                  :title="formatFullDateTime(log.timestamp)"
                >
                  {{ formatFullDateTime(log.timestamp) }}
                </div>
                <!-- Action Badge -->
                <div class="min-w-0 h-full items-center justify-start flex">
                  <span
                    class="pill font-medium truncate"
                    :class="actionBadgeClass(log.action)"
                  >
                    {{ log.action }}
                  </span>
                </div>
                <!-- Document Type -->
                <div
                  class="min-w-0 truncate h-full items-center justify-start flex text-foreground font-medium"
                  :title="log.documentType"
                >
                  {{ log.documentType }}
                </div>
                <!-- Document Name -->
                <div
                  class="min-w-0 truncate h-full items-center justify-start flex font-semibold text-primary dark:text-blue-400"
                  :title="log.documentName"
                >
                  {{ log.documentName }}
                </div>
                <!-- User -->
                <div
                  class="min-w-0 h-full items-center justify-start flex text-foreground"
                >
                  <div
                    class="flex items-center gap-2 min-w-0 w-full justify-start"
                  >
                    <Avatar
                      :label="log.user || 'System'"
                      size="sm"
                      class="flex-shrink-0"
                    />
                    <span class="truncate" :title="log.user || 'System'">{{
                      log.user || 'System'
                    }}</span>
                  </div>
                </div>
              </Row>
            </div>
            <hr class="dark:border-gray-800" />
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div
      class="mt-auto border-t border-gray-200 dark:border-gray-800 px-4 flex-shrink-0"
    >
      <Paginator
        :key="filteredLogs.length"
        :item-count="filteredLogs.length"
        @index-change="setPageIndices"
      />
    </div>

    <!-- Detail Modal -->
    <Teleport to="body">
      <Modal :open-modal="!!selectedLog" @closemodal="selectedLog = null">
        <div class="w-form p-5">
          <!-- Modal Header -->
          <div class="flex items-center justify-between">
            <p class="font-semibold text-lg text-foreground">
              {{ t`Audit Entry` }} #{{ selectedLogIndex + 1 }}
            </p>
            <button
              class="p-1 text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
              @click="selectedLog = null"
            >
              <FeatherIcon name="x" class="w-5 h-5" />
            </button>
          </div>

          <hr class="my-3 dark:border-gray-800" />

          <!-- Modal Body -->
          <div class="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div class="grid grid-cols-3 gap-y-3 gap-x-2">
              <div
                class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                {{ t`Serial No.` }}
              </div>
              <div class="col-span-2 text-sm font-medium text-foreground">
                {{ selectedLogIndex + 1 }}
              </div>

              <div
                class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                {{ t`Entry No.` }}
              </div>
              <div
                class="col-span-2 text-sm font-medium text-foreground select-all"
              >
                {{ selectedLog?.name }}
              </div>

              <div
                class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                {{ t`Timestamp` }}
              </div>
              <div class="col-span-2 text-sm font-medium text-foreground">
                {{
                  selectedLog ? formatFullDateTime(selectedLog.timestamp) : ''
                }}
              </div>

              <div
                class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                {{ t`Action` }}
              </div>
              <div class="col-span-2 text-sm font-medium text-foreground">
                <span
                  v-if="selectedLog"
                  class="pill font-medium"
                  :class="actionBadgeClass(selectedLog.action)"
                >
                  {{ selectedLog.action }}
                </span>
              </div>

              <div
                class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                {{ t`Document Type` }}
              </div>
              <div class="col-span-2 text-sm font-medium text-foreground">
                {{ selectedLog?.documentType }}
              </div>

              <div
                class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                {{ t`Document Name` }}
              </div>
              <div
                class="col-span-2 text-sm font-medium text-foreground font-mono text-primary dark:text-blue-400 break-all select-all"
              >
                {{ selectedLog?.documentName }}
              </div>

              <div
                class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                {{ t`User` }}
              </div>
              <div class="col-span-2 text-sm font-medium text-foreground">
                {{ selectedLog?.user || '—' }}
              </div>

              <div
                v-if="selectedLog?.checksum"
                class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                {{ t`Integrity Hash` }}
              </div>
              <div
                v-if="selectedLog?.checksum"
                class="col-span-2 text-[11px] font-mono break-all bg-gray-55 dark:bg-gray-900 border dark:border-gray-800 p-2 rounded text-foreground select-all"
              >
                {{ selectedLog.checksum }}
              </div>
            </div>

            <div
              v-if="selectedLog?.changes"
              class="mt-4 pt-4 border-t dark:border-gray-800"
            >
              <h3
                class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2"
              >
                {{ t`Changed Data` }}
              </h3>
              <pre
                class="bg-gray-55 dark:bg-gray-900 border dark:border-gray-800 text-xs font-mono p-4 rounded text-foreground select-all whitespace-pre-wrap break-all"
                style="max-height: 300px; min-height: 120px; overflow-y: auto"
                >{{ formatChanges(selectedLog.changes) }}</pre
              >
            </div>
          </div>

          <hr class="my-3 dark:border-gray-800" />

          <!-- Modal Footer -->
          <div class="flex items-center justify-between gap-4 mt-3">
            <p
              class="text-[10px] text-muted-foreground leading-relaxed max-w-sm"
            >
              🔒
              {{
                t`This record is part of the tamper-evident audit trail. Any modification will invalidate the integrity hash.`
              }}
            </p>
            <Button type="secondary" @click="selectedLog = null">{{
              t`Close`
            }}</Button>
          </div>
        </div>
      </Modal>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import PageHeader from 'src/components/PageHeader.vue';
import Button from 'src/components/Button.vue';
import Paginator from 'src/components/Paginator.vue';
import Modal from 'src/components/Modal.vue';
import Avatar from 'src/components/Avatar.vue';
import FeatherIcon from 'src/components/FeatherIcon.vue';
import FormControl from 'src/components/Controls/FormControl.vue';
import Row from 'src/components/Row.vue';
import { useAuditTrail } from 'src/composables/useAuditTrail';

const {
  t,
  loading,
  selectedLog,
  selectedLogIndex,
  pageStart,
  filters,
  gridTemplateColumns,
  fromDateDf,
  toDateDf,
  actionDf,
  documentTypeDf,
  searchDf,
  filteredLogs,
  paginatedLogs,
  stats,
  loadLogs,
  onFilterChange,
  handleSearchInput,
  clearFilters,
  sortBy,
  sortIcon,
  openDetail,
  formatDate,
  formatTime,
  formatFullDateTime,
  truncateChanges,
  formatChanges,
  setPageIndices,
  actionBadgeClass,
  exportCsv,
  printReport,
} = useAuditTrail();
</script>

<style scoped>
/* ── Print styles ────────────────────────────────────────────────────── */
@media print {
  body,
  table,
  th,
  td,
  div,
  span,
  p {
    font-family: 'Figtree', 'Figtree Variable', sans-serif !important;
  }

  #audit-table {
    overflow: visible;
    width: 100%;
  }

  table th,
  table td {
    border: 1px solid #ddd;
    padding: 6px 8px;
    font-size: 10px;
  }
}
</style>
