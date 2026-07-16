<template>
  <div class="wheel-time-picker">
    <select v-model.number="hh" @change="emitValue" class="wheel-col">
      <option v-for="h in 24" :key="h" :value="h-1">{{ String(h-1).padStart(2,'0') }}</option>
    </select>
    <select v-model.number="mm" @change="emitValue" class="wheel-col">
      <option v-for="m of minutes" :key="m" :value="m">{{ String(m).padStart(2,'0') }}</option>
    </select>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
const props = defineProps({ modelValue: String });
const emit = defineEmits(['update:modelValue']);

function parseTime(val){
  if(!val) return {hh:9,mm:0};
  const parts = val.split(':');
  return { hh: Number(parts[0]), mm: Number(parts[1]) };
}

const t = ref(parseTime(props.modelValue));
const hh = ref(t.value.hh);
const mm = ref(t.value.mm);
const minutes = computed(()=>{ const arr=[]; for(let i=0;i<60;i+=5) arr.push(i); return arr; });

watch(()=>props.modelValue, nv=>{
  const p=parseTime(nv); hh.value=p.hh; mm.value=p.mm;
});

function emitValue(){
  const s = `${String(hh.value).padStart(2,'0')}:${String(mm.value).padStart(2,'0')}`;
  emit('update:modelValue', s);
}
</script>

<style scoped>
.wheel-time-picker{display:flex;gap:8px;align-items:center}
.wheel-col{height:64px;overflow:auto;font-size:13px;border-radius:6px;padding:4px;width:64px}
</style>
