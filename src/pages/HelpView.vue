<template>
  <div class="flex h-full bg-canvas overflow-hidden">
    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col h-full overflow-hidden">
      <PageHeader :title="title">
        <template #right>
          <div class="flex gap-2">
            <Button variant="ghost" @click="$router.back()">
              <LucideIcon name="arrow-left" class="w-4 h-4 mr-2" />
              {{ t('Back') }}
            </Button>
          </div>
        </template>
      </PageHeader>

      <div class="flex-1 flex overflow-hidden">
        <!-- Content -->
        <div class="flex-1 overflow-y-auto custom-scroll p-8 lg:p-12">
          <div class="max-w-3xl mx-auto w-full">
            <div v-if="loading" class="flex items-center justify-center h-64">
              <div
                class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
              ></div>
            </div>

            <div
              v-else-if="error"
              class="bg-red-50 p-6 rounded-lg border border-red-100 text-red-700 flex flex-col items-center text-center"
            >
              <LucideIcon
                name="file-warning"
                class="w-12 h-12 mb-4 text-red-400"
              />
              <h3 class="text-lg font-bold mb-2">Documentation Not Found</h3>
              <p class="mb-4 text-sm opacity-90">{{ error }}</p>
              <Button @click="loadDefault">Go to Getting Started</Button>
            </div>

            <div v-else class="help-content-wrapper">
              <div
                class="help-content prose prose-slate max-w-none dark:prose-invert"
                v-html="renderedContent"
              ></div>
            </div>
          </div>
        </div>

        <!-- Right Sidebar (TOC) -->
        <div
          v-if="toc.length > 0 && !loading"
          class="hidden xl:block w-64 border-l border-border p-6 overflow-y-auto custom-scroll"
        >
          <h4
            class="text-xs font-bold uppercase tracking-widest text-muted mb-4"
          >
            On this page
          </h4>
          <nav class="space-y-1">
            <a
              v-for="item in toc"
              :key="item.id"
              :href="'#' + item.id"
              class="block text-sm py-1 transition-colors"
              :class="[
                item.level === 3 ? 'pl-4 text-muted' : 'text-main font-medium',
                'hover:text-blue-600',
              ]"
              @click.prevent="scrollTo(item.id)"
            >
              {{ item.text }}
            </a>
          </nav>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppStore } from 'src/stores/app';
import { marked } from 'marked';
import PageHeader from 'src/components/PageHeader.vue';
import Button from 'src/components/Button.vue';
import { ipc } from 'src/initFyo';

export default defineComponent({
  name: 'HelpView',
  components: {
    PageHeader,
    Button,
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    useAppStore();

    const title = ref('Documentation');
    const renderedContent = ref('');
    const loading = ref(true);
    const error = ref('');
    const toc = ref<{ id: string; text: string; level: number }[]>([]);

    const loadDefault = () => {
      router.push({ name: 'Help', params: { path: 'getting-started' } });
    };

    const loadContent = async () => {
      loading.value = true;
      error.value = '';
      toc.value = [];

      try {
        const pathParam = route.params.path;
        let relPath = Array.isArray(pathParam)
          ? pathParam.join('/')
          : pathParam;

        // Handle defaults and broken paths
        if (!relPath || relPath === 'books' || relPath === 'index') {
          relPath = 'getting-started';
        }

        // Strip legacy books/ prefix
        if (relPath.startsWith('books/')) {
          relPath = relPath.substring(6);
        }

        // Ensure docs/ prefix
        if (!relPath.startsWith('docs/')) {
          relPath = 'docs/' + relPath;
        }

        // Ensure .md extension
        if (!relPath.endsWith('.md')) relPath += '.md';

        let content = '';
        try {
          content = await ipc.readDocFile(relPath);
        } catch (e) {
          // Try fallback if file not found
          if (relPath !== 'docs/introduction.md') {
            relPath = 'docs/introduction.md';
            content = await ipc.readDocFile(relPath);
          } else {
            throw e;
          }
        }

        // Rebranding: Frappe Books -> Auditbooks
        content = content.replace(/Frappe Books/g, 'Auditbooks');
        content = content.replace(/frappe\/books/g, 'landigit/auditbooks');

        // Extract TOC
        const headingRegex = /^(#{2,3})\s+(.*)$/gm;
        let match;
        const tempToc = [];
        while ((match = headingRegex.exec(content)) !== null) {
          const level = match[1].length;
          const text = match[2].trim();
          const id = text.toLowerCase().replace(/[^\w]+/g, '-');
          tempToc.push({ id, text, level });
        }
        toc.value = tempToc;

        // Configure marked
        marked.setOptions({
          gfm: true,
          breaks: true,
        });

        // Handle ::: type alerts
        const containerRegex =
          /^::: (tip|info|warning|important|caution)\s?([\s\S]*?)\s?:::/gm;
        let processedContent = content;

        const placeholders: string[] = [];
        processedContent = processedContent.replace(
          containerRegex,
          (_, type, body) => {
            const id = `:::ALERT_PLACEHOLDER_${placeholders.length}:::`;
            const bodyHtml = marked.parseInline(body.trim());
            placeholders.push(`<div class="help-alert alert-${type}">
            <div class="alert-title font-bold uppercase text-xs mb-1">${type}</div>
            <div class="alert-body">${bodyHtml}</div>
          </div>`);
            return id;
          }
        );

        // Handle GitHub-style alerts > [!TIP]
        const alertRegex =
          /^> \[!(TIP|INFO|IMPORTANT|WARNING|CAUTION)\](?:\r?\n)((?:>.*\r?\n?)*)/gm;
        processedContent = processedContent.replace(
          alertRegex,
          (_, type, body) => {
            const typeLower = type.toLowerCase();
            const id = `:::ALERT_PLACEHOLDER_${placeholders.length}:::`;
            const cleanBody = body.replace(/^> ?/gm, '').trim();
            const bodyHtml = marked.parse(cleanBody);
            placeholders.push(`<div class="help-alert alert-${typeLower}">
            <div class="alert-title font-bold uppercase text-xs mb-1">${type}</div>
            <div class="alert-body">${bodyHtml}</div>
          </div>`);
            return id;
          }
        );

        // Pre-process images: fix paths and resolve spaces
        const docDir = relPath.includes('/')
          ? relPath.substring(0, relPath.lastIndexOf('/') + 1)
          : '';
        const imgRegex = /!\[(.*?)\]\((.*?)\)/g;
        const imgMatches = [...processedContent.matchAll(imgRegex)];

        for (const match of imgMatches) {
          const fullMatch = match[0];
          const alt = match[1];
          let href = match[2];

          if (href && !href.startsWith('http') && !href.startsWith('data:')) {
            try {
              let cleanSrc = decodeURIComponent(href);

              const isRelative =
                !cleanSrc.startsWith('/') &&
                !cleanSrc.startsWith('./') &&
                !cleanSrc.startsWith('../');
              cleanSrc = cleanSrc.replace(/^\.?\/+/, '');

              if (isRelative && docDir) {
                cleanSrc = docDir + cleanSrc;
              }

              const dataUrl = await ipc.readDocData(cleanSrc);
              processedContent = processedContent.replace(
                fullMatch,
                `![${alt}](${dataUrl})`
              );
            } catch (e) {
              console.warn('Failed to pre-load image:', href, e);
            }
          }
        }

        let html = await marked(processedContent);

        // Restore placeholders
        placeholders.forEach((htmlBlock, index) => {
          html = html.replace(`:::ALERT_PLACEHOLDER_${index}:::`, htmlBlock);
        });

        // Add IDs to headings for TOC scroll
        toc.value.forEach((item) => {
          const hRegex = new RegExp(
            `<(h${item.level})>(.*?${item.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*?)</h${item.level}>`,
            'i'
          );
          html = html.replace(hRegex, `<$1 id="${item.id}">$2</$1>`);
        });

        renderedContent.value = html;

        title.value = 'Documentation';
      } catch (e: any) {
        console.error('Failed to load help file:', e);
        error.value = 'Documentation file not found or could not be loaded.';
      } finally {
        loading.value = false;
      }
    };

    const scrollTo = (id: string) => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    };

    onMounted(() => {
      loadContent();
    });

    watch(
      () => route.params.path,
      () => loadContent()
    );

    return {
      title,
      renderedContent,
      loading,
      error,
      toc,
      scrollTo,
      loadDefault,
    };
  },
});
</script>

<style scoped>
.help-content :deep(h1) {
  font-size: 2.25rem;
  font-weight: 800;
  margin-bottom: 2rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-main);
}
.help-content :deep(h2) {
  font-size: 1.75rem;
  font-weight: 700;
  margin-top: 3rem;
  margin-bottom: 1.25rem;
  color: var(--color-text-main);
}
.help-content :deep(h3) {
  font-size: 1.375rem;
  font-weight: 600;
  margin-top: 2rem;
  margin-bottom: 1rem;
  color: var(--color-text-main);
}
.help-content :deep(p) {
  margin-bottom: 1.25rem;
  line-height: 1.75;
  color: var(--color-text-muted);
}
.help-content :deep(hr) {
  margin: 2.5rem 0;
  border: 0;
  border-top: 1px solid var(--color-border);
  opacity: 0.6;
}
.help-content :deep(ul) {
  list-style-type: disc;
  margin-bottom: 1.5rem;
  margin-left: 1.5rem;
  color: var(--color-text-muted);
}
.help-content :deep(ol) {
  list-style-type: decimal;
  margin-bottom: 1.5rem;
  margin-left: 1.5rem;
  color: var(--color-text-muted);
}
.help-content :deep(li) {
  margin-bottom: 0.625rem;
}
.help-content :deep(table) {
  width: 100%;
  margin-top: 2rem;
  margin-bottom: 2rem;
  border-collapse: collapse;
  border: 1px solid var(--color-border);
  font-size: 0.875rem;
}
.help-content :deep(th),
.help-content :deep(td) {
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  text-align: left;
}
.help-content :deep(th) {
  background-color: var(--color-surface-gray-1);
  font-weight: 700;
}
.help-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 0.75rem;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  margin-top: 2.5rem;
  margin-bottom: 2.5rem;
  border: 1px solid var(--color-border);
  display: block;
  margin-left: auto;
  margin-right: auto;
}
.help-content :deep(code) {
  background-color: var(--color-surface-gray-1);
  padding: 0.2rem 0.4rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: #d11141;
}
.help-content :deep(a) {
  color: var(--color-blue-600);
  text-decoration: none;
  font-weight: 500;
}
.help-content :deep(a:hover) {
  text-decoration: underline;
}
.help-content :deep(.help-alert) {
  margin-top: 2rem;
  margin-bottom: 2rem;
  padding: 1.25rem;
  border-radius: 0 0.5rem 0.5rem 0;
  border-left-width: 4px;
}
.help-content :deep(.alert-tip) {
  background-color: #f0fdf4;
  border-left-color: #22c55e;
}
.help-content :deep(.alert-info) {
  background-color: #eff6ff;
  border-left-color: #3b82f6;
}
.help-content :deep(.alert-warning) {
  background-color: #fffbeb;
  border-left-color: #f59e0b;
}
.help-content :deep(.alert-important),
.help-content :deep(.alert-caution) {
  background-color: #fef2f2;
  border-left-color: #ef4444;
}
</style>
