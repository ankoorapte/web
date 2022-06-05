import { initializeApp } from "https://www.gstatic.com/firebasejs/9.8.2/firebase-app.js";
import { getStorage, ref, uploadBytes } from "https://www.gstatic.com/firebasejs/9.8.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDzJylYhhlw9LVay0OUkAyMmR9vYJsXr8U",
  authDomain: "player-76353.firebaseapp.com",
  projectId: "player-76353",
  storageBucket: "player-76353.appspot.com",
  messagingSenderId: "954598460815",
  appId: "1:954598460815:web:52ae341cbaf40a1c6e8ffa",
  measurementId: "G-VK3H3Y1430"
};

const firebaseApp = initializeApp(firebaseConfig);
const storage = getStorage(firebaseApp);

let app = new Vue({
  el: '#app',
  template: `
  <b-container style="background-color:#E0FFF2">
    <b-row class="m-1 p-1">
      <b-col align="center">
        <b-button variant="success" v-b-toggle.sidebar-variant>Create</b-button>
        <b-sidebar id="sidebar-variant" title="Sidebar" bg-variant="light" text-variant="dark" shadow>
          <div class="px-3 py-2">
            <b-form-file
              v-model="file"
              placeholder="Drop .wav here"
              accept="audio/wav"
              @input="onFile"
              class="m-2"
            ></b-form-file>
            <audio class="m-2" ref="audioPlayer" controls>
              <source :src="audio" type="audio/wav">
              Your browser does not support the <code>audio</code> element.
            </audio>
            <br>
            <b-button class="m-2" variant="success" @click="upload">Upload</b-button>
          </div>
        </b-sidebar>
      </b-col>
    </b-row>
  </b-container>
  `,
  data() {
    return {
      file: null,
      audio: null
    }
  },
  methods: {
    async upload() {
      let uuidRef = ref(storage, 'public/'+uuidv4());
      await uploadBytes(uuidRef, this.file);
      console.log('Uploaded file to ' + uuidRef._location.path_);
    },
    onFile(file) {
      this.audio = window.URL.createObjectURL(file);
      this.$refs.audioPlayer.load();
    }
  }
})
