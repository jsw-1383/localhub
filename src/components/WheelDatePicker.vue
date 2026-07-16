<template>
  <div class="wheel-date-picker">
    <select v-model.number="y" @change="emitValue" class="wheel-col">
      <option v-for="yr in years" :key="yr" :value="yr">{{ yr }}</option>
    </select>
    <select v-model.number="m" @change="emitValue" class="wheel-col">
      <option v-for="mo in 12" :key="mo" :value="mo">{{ String(mo).padStart(2,'0') }}</option>
    </select>
    <select v-model.number="d" @change="emitValue" class="wheel-col">
      <option v-for="day in daysInMonth" :key="day" :value="day">{{ String(day).padStart(2,'0') }}</option>
    </select>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
const props = defineProps({ modelValue: String });
const emit = defineEmits(['update:modelValue']);

function parseDateParts(val){
  if(!val) return new Date();
  const parts = val.split('-');
  return new Date(parts[0], Number(parts[1]) -1, parts[2]);
}

const date = ref(parseDateParts(props.modelValue));
const y = ref(date.value.getFullYear());
const m = ref(date.value.getMonth() + 1);
const d = ref(date.value.getDate());

const years = computed(()=>{ const now=new Date().getFullYear(); const arr=[]; for(let i=now-1;i<=now+2;i++)arr.push(i); return arr; });

const daysInMonth = computed(()=>{
  return new Array(new Date(y.value, m.value, 0).getDate()).fill(0).map((_,i)=>i+1);
});

watch(()=>props.modelValue, nv=>{
  const dt=parseDateParts(nv);
  y.value=dt.getFullYear(); m.value=dt.getMonth()+1; d.value=dt.getDate();
});

function emitValue(){
  const dt = new Date(y.value, m.value-1, d.value);
  const str = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  emit('update:modelValue', str);
}
</script>

<style scoped>
.wheel-date-picker{display:flex;gap:8px;align-items:center}
.wheel-col{height:64px;overflow:auto;font-size:13px;border-radius:6px;padding:4px}
.wheel-col:first-child{width:90px}
.wheel-col:nth-child(2){width:64px}
.wheel-col:nth-child(3){width:64px}
</style>
