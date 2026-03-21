<script lang="ts">
import { defineComponent } from "vue";
import Base from "./Base.vue";

export default defineComponent({
	name: "Secret",
	extends: Base,
	computed: {
		inputType() {
			return "password";
		},
	},
});
</script>
