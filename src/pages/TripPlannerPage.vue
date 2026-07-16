<template>
  <section>
    <div class="list-header">
      <h1 class="page-title">여행 일정 생성/관리</h1>
      <button class="primary" @click="addDay">Day 추가</button>
    </div>

    <div class="trip-card">
      <div class="form-group">
        <label>여행 제목</label>
        <input type="text" v-model="tripTitle" placeholder="여행 제목을 입력하세요" />
      </div>

      <div class="trip-list">
        <article v-for="day in itinerary" :key="day.id" class="trip-item">
          <header>
            <strong>Day {{ day.day }}</strong>
            <div class="day-actions">
              <button class="secondary" @click="addSchedule(day.id)">항목 추가</button>
              <button class="secondary" @click="removeDay(day.id)">삭제</button>
            </div>
          </header>

          <div style="margin:6px 0">
            <label style="font-size:13px;color:#444;margin-right:8px">날짜 선택:</label>
            <WheelDatePicker v-model="day.date" @update:modelValue="() => { const idx = itinerary.findIndex(d=>d.id===day.id); if(idx!==-1){ let cur = parseDateFromStr(day.date); cur.setDate(cur.getDate()+0); for(let i=idx+1;i<itinerary.length;i++){ cur.setDate(cur.getDate()+1); itinerary[i].date = formatLocalDate(cur); } } }" />
          </div>

          <div v-for="item in day.items" :key="item.id" class="schedule-block">
            <div class="schedule-row">
              <WheelTimePicker v-model="item.time" />
              <input v-model="item.place" type="text" placeholder="장소를 입력하세요" />
              <button class="secondary" @click="removeSchedule(day.id, item.id)">삭제</button>
            </div>
            <div class="memo-toggle">
              <label>
                <input type="checkbox" v-model="item.hasMemo" />
                메모 추가
              </label>
            </div>
            <textarea v-if="item.hasMemo" v-model="item.note" class="memo-input" placeholder="메모를 입력하세요"></textarea>
          </div>
        </article>
      </div>

      <div class="page-actions">
        <button class="primary" @click="savePlan">저장</button>
        <button class="secondary" @click="clearPlan">초기화</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import WheelDatePicker from '../components/WheelDatePicker.vue';
import WheelTimePicker from '../components/WheelTimePicker.vue';

function formatLocalDate(d){ const dt = new Date(d); dt.setHours(0,0,0,0); const y=dt.getFullYear(); const m=String(dt.getMonth()+1).padStart(2,'0'); const day=String(dt.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
function parseDateFromStr(s){ if(!s) return new Date(); const parts = s.split('-'); return new Date(Number(parts[0]), Number(parts[1])-1, Number(parts[2])); }

const tripTitle = ref('광주 여행 일정');
const itinerary = reactive([
  {
    id: 1,
    day: 1,
    date: formatLocalDate(new Date()),
    items: [
      {
        id: Date.now(),
        time: '09:00',
        place: '황리단길',
        hasMemo: true,
        note: '문화공간과 카페가 모여 있는 인기 거리'
      }
    ]
  }
]);

onMounted(()=>{
  // ensure Day1 is today
  if(itinerary.length>0) itinerary[0].date = formatLocalDate(new Date());
});

function addDay() {
  itinerary.push({
    id: Date.now(),
    day: itinerary.length + 1,
      date: (()=>{ const last = itinerary[itinerary.length-1]; if(last && last.date){ const d=parseDateFromStr(last.date); d.setDate(d.getDate()+1); return formatLocalDate(d);} const d=new Date(); d.setHours(0,0,0,0); return formatLocalDate(d); })(),
    items: [
      {
        id: Date.now() + Math.random(),
        time: '',
        place: '',
        hasMemo: false,
        note: ''
      }
    ]
  });
}

function addSchedule(dayId) {
  const day = itinerary.find(item => item.id === dayId);
  if (!day) return;
  day.items.push({
    id: Date.now() + Math.random(),
    time: '',
    place: '',
    hasMemo: false,
    note: ''
  });
}

function removeDay(id) {
  const index = itinerary.findIndex(item => item.id === id);
  if (index !== -1) itinerary.splice(index, 1);
  itinerary.forEach((item, idx) => item.day = idx + 1);
}

function removeSchedule(dayId, itemId) {
  const day = itinerary.find(item => item.id === dayId);
  if (!day) return;
  day.items = day.items.filter(item => item.id !== itemId);
}

function savePlan() {
  alert('일정이 저장되었습니다. (브라우저 메모리 내 저장)');
}

function clearPlan() {
  itinerary.splice(0, itinerary.length);
  itinerary.push({
    id: 1,
    day: 1,
    items: [
      {
        id: Date.now(),
        time: '',
        place: '',
        hasMemo: false,
        note: ''
      }
    ]
  });
  tripTitle.value = '광주 여행 일정';
}
</script>
