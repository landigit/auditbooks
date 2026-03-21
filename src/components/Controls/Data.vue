<script lang="ts">
import { defineComponent } from "vue";
import Base from "./Base.vue";

export default defineComponent({
	name: "Data",
	extends: Base,
	computed: {
		inputType() {
			return "text";
		},
	},
});
</script>
