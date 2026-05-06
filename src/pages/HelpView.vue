<template>
  <div class="flex flex-col h-full bg-canvas">
    <PageHeader :title="title">
      <template #right>
        <Button @click="$router.back()">
          <lucide-icon name="arrow-left" class="w-4 h-4 mr-2" />
          {{ t('Back') }}
        </Button>
      </template>
    </PageHeader>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto custom-scroll p-8 max-w-4xl mx-auto w-full">
      <div v-if="loading" class="flex items-center justify-center h-64">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
      
      <div v-else-if="error" class="bg-red-50 p-4 rounded border border-red-200 text-red-700">
        {{ error }}
      </div>
      
      <div v-else class="help-content prose prose-slate max-w-none dark:prose-invert" v-html="renderedContent"></div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, nextTick } from 'vue';
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
    Button
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const appStore = useAppStore();
    
    const title = ref('Documentation');
    const renderedContent = ref('');
    const loading = ref(true);
    const error = ref('');

    const loadContent = async () => {
      loading.value = true;
      error.value = '';
      
      try {
        const pathParam = route.params.path;
        let relPath = Array.isArray(pathParam) ? pathParam.join('/') : (pathParam as string);
        
        if (!relPath) {
          relPath = appStore.docsPath || 'getting-started';
        }
        
        // Strip legacy books/ prefix and ensure docs/ prefix
        if (relPath.startsWith('books/')) {
          relPath = relPath.substring(6);
        }
        if (relPath && !relPath.startsWith('docs/')) {
          relPath = 'docs/' + relPath;
        }

        // Use .md extension
        if (!relPath.endsWith('.md')) relPath += '.md';
        
        const content = await ipc.readDocFile(relPath);
        
        // Configure marked
        marked.setOptions({
          gfm: true,
          breaks: true
        });

        // Handle ::: type alerts
        const containerRegex = /^::: (tip|info|warning|important|caution)\s?([\s\S]*?)\s?:::/gm;
        let processedContent = content;
        
        const placeholders: string[] = [];
        processedContent = processedContent.replace(containerRegex, (match, type, body) => {
          const id = `:::ALERT_PLACEHOLDER_${placeholders.length}:::`;
          const bodyHtml = marked.parseInline(body.trim());
          placeholders.push(`<div class="help-alert alert-${type}">
            <div class="alert-title font-bold uppercase text-xs mb-1">${type}</div>
            <div class="alert-body">${bodyHtml}</div>
          </div>`);
          return id;
        });

        // Handle GitHub-style alerts > [!TIP]
        const alertRegex = /^> \[!(TIP|INFO|IMPORTANT|WARNING|CAUTION)\](?:\r?\n)((?:>.*\r?\n?)*)/gm;
        processedContent = processedContent.replace(alertRegex, (match, type, body) => {
          const typeLower = type.toLowerCase();
          const id = `:::ALERT_PLACEHOLDER_${placeholders.length}:::`;
          const cleanBody = body.replace(/^> ?/gm, '').trim();
          const bodyHtml = marked.parse(cleanBody);
          placeholders.push(`<div class="help-alert alert-${typeLower}">
            <div class="alert-title font-bold uppercase text-xs mb-1">${type}</div>
            <div class="alert-body">${bodyHtml}</div>
          </div>`);
          return id;
        });

        // Pre-process images: find all ![]() and replace with data URLs
        const docDir = relPath.includes('/') ? relPath.substring(0, relPath.lastIndexOf('/') + 1) : '';
        const imgRegex = /!\[(.*?)\]\((.*?)\)/g;
        const imgMatches = [...processedContent.matchAll(imgRegex)];
        
        for (const match of imgMatches) {
          const fullMatch = match[0];
          const alt = match[1];
          const href = match[2];
          
          if (href && !href.startsWith('http') && !href.startsWith('data:')) {
            try {
              let cleanSrc = decodeURIComponent(href);
              const isRelative = !cleanSrc.startsWith('/') && !cleanSrc.startsWith('./') && !cleanSrc.startsWith('../');
              cleanSrc = cleanSrc.replace(/^\.?\/+/, '');
              
              if (isRelative && docDir) {
                cleanSrc = docDir + cleanSrc;
              }
              
              const dataUrl = await ipc.readDocData(cleanSrc);
              processedContent = processedContent.replace(fullMatch, `![${alt}](${dataUrl})`);
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

        renderedContent.value = html;
        
        // Extract title or fallback to filename
        const titleMatch = content.match(/^# (.*)/m) || content.match(/^(.*)\n={3,}/m);
        let extractedTitle = '';
        
        if (titleMatch && titleMatch[1] && titleMatch[1].trim()) {
          extractedTitle = titleMatch[1].trim();
        } else {
          // Fallback: humanize the filename
          const filename = relPath.split('/').pop()?.replace('.md', '') || 'Dashboard';
          extractedTitle = filename.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
        }
        
        title.value = `Documentation / ${extractedTitle}`;
      } catch (e: any) {
        console.error('Failed to load help file:', e);
        error.value = 'Documentation file not found or could not be loaded.';
      } finally {
        loading.value = false;
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
      error
    };
  }
});
</script>

<style scoped>
.help-content :deep(h1) {
  font-size: 1.875rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}
.help-content :deep(h2) {
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 2rem;
  margin-bottom: 1rem;
}
.help-content :deep(h3) {
  font-size: 1.25rem;
  font-weight: 500;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}
.help-content :deep(p) {
  margin-bottom: 1rem;
  line-height: 1.625;
}
.help-content :deep(ul), .help-content :deep(ol) {
  margin-bottom: 1rem;
  margin-left: 1.5rem;
}
.help-content :deep(li) {
  margin-bottom: 0.5rem;
}
.help-content :deep(table) {
  width: 100%;
  margin-bottom: 1.5rem;
  border-collapse: collapse;
  border: 1px solid var(--color-border);
}
.help-content :deep(th), .help-content :deep(td) {
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  text-align: left;
}
.help-content :deep(th) {
  background-color: var(--color-gray-50);
  font-weight: 600;
}
.help-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid var(--color-border);
  display: block;
  margin-left: auto;
  margin-right: auto;
}
.help-content :deep(code) {
  background-color: var(--color-gray-50);
  padding-left: 0.375rem;
  padding-right: 0.375rem;
  padding-top: 0.125rem;
  padding-bottom: 0.125rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  color: var(--color-blue-700);
}
.help-content :deep(.help-alert) {
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  border-radius: 0 0.25rem 0.25rem 0;
  border-left-width: 4px;
}
.help-content :deep(.alert-tip) {
  background-color: var(--color-green-50);
  border-left-color: var(--color-green-500);
}
.help-content :deep(.alert-info) {
  background-color: var(--color-blue-50);
  border-left-color: var(--color-blue-500);
}
.help-content :deep(.alert-warning) {
  background-color: var(--color-yellow-50);
  border-left-color: var(--color-yellow-500);
}
.help-content :deep(.alert-important), .help-content :deep(.alert-caution) {
  background-color: var(--color-red-50);
  border-left-color: var(--color-red-500);
}
</style>
