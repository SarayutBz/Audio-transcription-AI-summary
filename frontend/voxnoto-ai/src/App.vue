<script setup>
import { ref } from "vue";

const result = ref("");

async function uploadFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("audio", file);

  try {
    const res = await fetch("http://localhost:3000/upload", {
      method: "POST",
      body: formData,
    });

    result.value = await res.text();
  } catch (error) {
    console.error("Upload failed:", error);
    result.value = "Error uploading file.";
  }
}
</script>

<template>
  
  <input type="file" @change="uploadFile" accept="audio/*" />
  <p v-if="result">Server Response: {{ result }}</p>

</template>
