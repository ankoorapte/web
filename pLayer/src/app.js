// IMPORTS
import { 
  initializeApp 
} from "https://www.gstatic.com/firebasejs/9.8.2/firebase-app.js";

import { 
  getAuth,
  signInWithEmailAndPassword, 
  sendEmailVerification,
  onAuthStateChanged, 
  signOut } from "https://www.gstatic.com/firebasejs/9.8.2/firebase-auth.js";

import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL } from "https://www.gstatic.com/firebasejs/9.8.2/firebase-storage.js";

import { 
  getFirestore, 
  collection,
  onSnapshot  } from "https://www.gstatic.com/firebasejs/9.8.2/firebase-firestore.js";

// FIREBASE
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
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

// CACHES
let tracks = {};
let layers = {};
let users = {};
let unsubscribe_tracks = () => {};
let unsubscribe_layers = () => {};
let unsubscribe_users = () => {};

NodeList.prototype.forEach = Array.prototype.forEach;

// APP
let app = new Vue({
  el: '#app',
  // GUI
  template: `
  <b-container style="background-color:#E1F3F6;">
    <b-row style="font-size:40px">
      <b-col align="center">
        <h1 @click="tabIndex = 1" class="mt-2" style="font-family:Georgia, serif;"><b>pLayer</b></h1>
      </b-col>
    </b-row>
    <div ref="pLayer"></div>
    <b-row><b-col align="center">
      <b-card v-if="!signedIn" align="center" class="w-75">
        <b-form-group
          :invalid-feedback="invalidCredentials"
          :state="stateCredentials"
          align="center"
        >
          <b-form-input placeholder="email" @keydown.native="signinKeydownHandler" v-model="email" :state="stateCredentials" trim></b-form-input>
          <b-form-input placeholder="password" @keydown.native="signinKeydownHandler" type="password" id="input-2" v-model="password" :state="stateCredentials" trim></b-form-input>
        </b-form-group>
        <b-button :disabled="!stateCredentials" @click="signIn(0)" variant="success">sign in</b-button>
      </b-card>
    </b-col></b-row>
    <b-collapse v-model="signedIn">
      <b-tabs card align="center" v-model="tabIndex" class="mb-3">
        <b-tab class="p-0">
          <template #title>
            <b-icon icon="music-note-list"></b-icon> post
          </template>
          <b-row><b-col align="center" v-show="!busy">
            <b-form-file
              placeholder=""
              accept="audio/wav"
              v-model="layer"
              browse-text="upload"
              class="mb-1 mt-1"
              :disabled="busy"
            ></b-form-file>
            <b-input-group append="name" class="mb-1">
              <b-form-input v-model="newTrackName" :disabled="busy"></b-form-input>
            </b-input-group>
            <p class="mt-2">
              <b-button :disabled="busy" variant="outline-dark" @click="layering = !layering" v-if="!layering"> click to layer on top of <b>{{trackName}}</b> by <b>{{artistNames.join(", ")}}</b></b-button>
              <b-button :disabled="busy" variant="danger" @click="layering = !layering" v-if="layering"> layering on top of <b>{{trackName}}</b> by <b>{{artistNames.join(", ")}}</b></b-button>
              <b-button :disabled="busy || !layer || !newTrackName.length" variant="success" @click="post()"><b-icon icon="music-note-list"></b-icon> post</b-button>
            </p>
          </b-col></b-row>
        </b-tab>
        <b-tab active class="p-0">
          <template #title>
            <b-icon icon="house"></b-icon> home
          </template>
          <b-list-group v-for="(disco_item, index) in group_discography" v-bind:key="disco_item.trackID">
            <b-list-group-item class="p-0 d-flex justify-content-between align-items-center">
              <p class="ml-2 mb-0">{{ getTrackName(disco_item.trackID) }}</p>
              <p class="mr-2 mb-0">
                <b-badge href="#" variant="dark" @click="playGroupDiscography(index)">play</b-badge>
                <b-badge href="#" variant="info" @click="layerGroupDiscography(index)">layer</b-badge>
              </p>
            </b-list-group-item>
          </b-list-group>
        </b-tab>
        <b-tab class="p-0">
          <template #title>
            <b-icon icon="person"></b-icon> {{ user.displayName ? user.displayName : "" }}
          </template>
          <b-tabs card align="center">
            <b-tab active class="p-0">
              <template #title>
                <b-icon icon="music-note-list"></b-icon>
              </template>
              <b-col v-if="!discography || !discography.length" align="center" class="mt-2">
                <p>You have no tracks yet. Head over to the "post" tab to upload a new track!</p>
              </b-col>
              <b-list-group v-for="(disco_item, index) in discography" v-bind:key="disco_item.trackID">
                <b-list-group-item class="p-0 d-flex justify-content-between align-items-center">
                  <p class="ml-2 mb-0">{{ getTrackName(disco_item.trackID) }}</p>
                  <p class="mr-2 mb-0">
                    <b-badge href="#" variant="dark" @click="playDiscography(index)">play</b-badge>
                  </p>
                </b-list-group-item>
              </b-list-group>
            </b-tab>
            <b-tab class="p-0">
              <template #title>
                <p class="m-0"><b-icon icon="bell"></b-icon> {{inbox.length || outbox.length ? "(" + (inbox.length+outbox.length) + ")" : ""}}</p>
              </template>
              <b-col v-if="!inbox.length && !outbox.length" align="center" class="mt-2">
                <p>No new notifications.</p>
              </b-col>
              <b-list-group v-for="(inbox_item, index) in inbox" v-bind:key="inbox_item.layerID">
                <b-list-group-item class="p-0 d-flex justify-content-between align-items-center">
                  <p class="ml-1 mb-0">
                    <b>{{ getUserName(inbox_item.userID) }}</b> wants to layer <b>{{ getLayerName(inbox_item.layerID) }}</b> on top of <b>{{ getLayerName(inbox_item.baseID) }}</b>
                  </p>
                  <p class="mr-1 mb-0">
                    <b-badge href="#" variant="dark" @click="playDraft(index, 'inbox')">play</b-badge>
                    <b-badge href="#" variant="success" @click="resolveDraft(index, 1)">accept</b-badge>
                    <b-badge href="#" variant="danger" @click="resolveDraft(index, 0)">reject</b-badge>
                  </p>
                </b-list-group-item>
              </b-list-group>
              <b-list-group v-for="(outbox_item, index) in outbox" v-bind:key="outbox_item.layerID">
                <b-list-group-item class="p-0 d-flex justify-content-between align-items-center">
                  <p class="ml-1 mb-0">You want to layer <b>{{ getLayerName(outbox_item.layerID) }}</b> on top of <b>{{ getLayerName(outbox_item.baseID) }}</b> by <b>{{ getUserName(getBaseUser(outbox_item.baseID)) }}</b></p>
                  <p class="mr-1 mb-0">
                    <b-badge href="#" variant="dark" @click="playDraft(index, 'outbox')">play</b-badge>
                  </p>
                </b-list-group-item>
              </b-list-group>
            </b-tab>
            <b-tab class="p-0">
              <template #title>
                <b-icon icon="wrench"></b-icon>
              </template>
              <b-col align="center">
                <b-input-group class="m-2">
                  <b-form-input
                    placeholder="new username"
                    @keydown.native="usernameKeydownHandler" 
                    v-model="newUsername" 
                    :state="stateUsername" 
                    trim
                  >
                  </b-form-input>
                  <b-input-group-append>
                    <b-button variant="dark" :sign="busy || !newUsername" @click="changeUsername(0)">update username</b-button>
                  </b-input-group-append>
                </b-input-group>
                <b-input-group class="m-2">
                  <b-form-input
                    placeholder="new password"
                    @keydown.native="passwordKeydownHandler" 
                    v-model="newPassword" 
                    type="password" 
                    :state="statePassword" 
                    trim
                  >
                  </b-form-input>
                  <b-input-group-append>
                    <b-button variant="dark" :sign="busy || !newPassword" @click="changePassword()">update password</b-button>
                  </b-input-group-append>
                </b-input-group>
                <b-input-group class="m-2">
                  <b-form-input
                    placeholder="new email"
                    @keydown.native="emailKeydownHandler" 
                    v-model="newEmail"
                    :state="stateEmail" 
                    trim
                  >
                  </b-form-input>
                  <b-input-group-append>
                    <b-button variant="dark" :sign="busy || !newEmail" @click="changeEmail()">update email</b-button>
                  </b-input-group-append>
                </b-input-group>
                <a href="https://forms.gle/TSSQvBinSwGLrnyT6" target="_blank">Report feedback</a>
                <hr>
                <b-button v-show="!busy" variant="danger" @click="signOut">sign out</b-button>
              </b-col>
            </b-tab>
          </b-tabs>
        </b-tab>
      </b-tabs>
    </b-collapse>
    <b-navbar variant="faded" fixed="bottom" type="dark">
      <b-col align="center">
        <b-spinner v-show="busy" variant="dark" type="grow"></b-spinner>
        <p v-if="!busy" style="font-size:22px" @click="showLayers = !showLayers" class="mb-0"><b class="mb-0">{{trackName}}</b></p>
        <p v-if="!busy" style="font-size:18px" @click="showLayers = !showLayers">{{artistNames.join(", ")}}</p>
        <p v-show="draft.length" style="font-size:12px">
          <i>draft version with new layer <b>{{getLayerName(draft)}}</b></i>
        </p>
        <b-collapse v-model="showLayers" class="mb-2">
          <b-list-group v-for="(layer_item, index) in layerBuffers" v-bind:key="index">
            <b-list-group-item class="p-0 d-flex justify-content-between align-items-center">
              <p style="font-size:14px" class="mb-0"> 
                <b>{{ getLayerName(layer_item.id) }}</b> by 
                {{ getUserName(layer_item.user) }}
              </p>
            </b-list-group-item>
          </b-list-group>
        </b-collapse>
        <p v-if="!busy">
          <b-button :disabled="busy" variant="dark" @click="toggleTrack(0)" class="p-1"><b-icon icon="skip-backward-fill"></b-icon></b-button>
          <b-button :disabled="busy" variant="dark" @click="togglePlay()" class="p-1" v-show="!paused"><b-icon icon="pause-fill"></b-icon></b-button>
          <b-button :disabled="busy" variant="dark" @click="togglePlay()" class="p-1" v-show="paused"><b-icon icon="play-fill"></b-icon></b-button>
          <b-button :disabled="busy" variant="dark" @click="toggleTrack(1)" class="p-1"><b-icon icon="skip-forward-fill"></b-icon></b-button>
        </p>
        <b-form-input v-if="!busy" type="range" @input="seekerInput" v-model="slider" min="0" :max="trackDuration" step="0.1"></b-form-input>
        <p style="font-size:9px" class="m-auto">Copyright © 2023 - Ankoor Apte. All rights reserved.</p>
      </b-col>
    </b-navbar>
  </b-container>
  `,
  data() {
    return {
      tab: 0,
      user: "",
      signedIn: false,
      email: "",
      password: "",
      newUsername: "",
      newPassword: "",
      newEmail: "",
      busy: true,
      layer: null,
      layers: [],
      layerBuffers: [],
      trackName: "",
      artistNames: [],
      newTrackName: "",
      trackID: "",
      trackIdx: 0,
      layering: false,
      paused: true,
      audioContext: null,
      merger: null,
      mixedAudio: null,
      seeker: 0,
      inbox: [],
      outbox: [],
      discography: [],
      group_discography: [],
      draft: "",
      activeLayer: "",
      inactiveLayers: [],
      tabIndex: 1,
      showLayers: false,
      trackDuration: 0,
      interval: null,
      slider: 0,
    }
  },
  async created() {
    let self = this;
    onAuthStateChanged(auth, async (user) => {
      self.busy = true;
      if(user) { await self.signIn(user); }
      if(self.signedIn) {
        self.resetAudioContext();
        unsubscribe_layers = onSnapshot(collection(db, "layers"), (layerDocs) => {
          layers = {};
          layerDocs.forEach((doc) => {
            layers[doc.id] = doc.data();
          });
          self.updateBoxes();
        });

        unsubscribe_tracks = onSnapshot(collection(db, "tracks"), (trackDocs) => {
          tracks = {};
          trackDocs.forEach((doc) => {
            tracks[doc.id] = doc.data();
          });
          self.trackID = Object.keys(tracks)[0];
          self.updateDiscography();
          self.getTrack();
        });

        unsubscribe_users = onSnapshot(collection(db, "users"), (userDocs) => {
          users = {};
          userDocs.forEach((doc) => {
            users[doc.id] = doc.data();
          });
        });
      }
      self.busy = false;
    });
    self.busy = false;
  },
  computed: {
    stateCredentials() {
      return this.password.length >= 6 && this.email.includes("@") && this.email.includes(".");
    },
    invalidCredentials() {
      return 'enter a valid email ID and password with minimum 6 characters.'
    },
    stateUsername() {
      return this.user
        && !Object.keys(users).includes(this.newUsername)
        && Boolean(this.newUsername.length);
    },
    statePassword() {
      return this.newPassword.length >= 6;
    },
    stateEmail() {
      return this.newEmail.includes("@") && this.email.includes(".");
    }
  },
  methods: {
    isMobile() {
      let check = false;
      (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
      return check;
    },
    async pLayerAPI(endpoint = "", arg = {}) {
      this.busy = true;
      if(endpoint != "createUser") arg['id'] = await this.user.getIdToken(/* forceRefresh */ true);
      arg['endpoint_name'] = endpoint;
      let res = await fetch('https://us-central1-player-76353.cloudfunctions.net/pLayerAPI',{
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(arg)
      });
      let res_json = await res.json();
      this.busy = false;
      if(res_json['stack'] && res_json['stack'].slice(0,5) == "Error") {
        throw new Error(res_json.message);
      } else if(res_json['status'] && res_json['status'] == "ok") {
        return res_json['data'];
      } else {
        throw new Error("No status found in response");
      }
    },
    async createUser() {
      let self = this;
      self.user = await self.pLayerAPI("createUser", {
        email: self.email,
        password: self.password
      });
    },
    async signIn(user) {
      try {
        if(user) {
          this.user = user;
          this.newUsername = user.displayName;
        } else {
          this.user = (await signInWithEmailAndPassword(
            auth, 
            this.email, 
            this.password
          )).user;
        }
        if(this.user.emailVerified) {
          this.signedIn = true;
        } else {
          alert('Please go to your email inbox and verify your email.')
          await sendEmailVerification(auth.currentUser);
          this.signedIn = false;
        }
      } catch(e) {
        console.log(e.code + ": " + e.message);
        if(e.code == "auth/user-not-found") {
          await this.createUser();
        }
        if(e.code == "auth/wrong-password") {
          alert("Wrong password!")
        }
      }
    },
    async signOut() {
      this.resetAudioContext();
      await this.forcePause();
      unsubscribe_tracks();
      unsubscribe_layers();
      unsubscribe_users();
      this.signedIn = false;
      this.user = null;
      this.email = "";
      this.password = "";
      await signOut(auth);
    },
    async changeUsername(un) {
      if(!un) un = this.newUsername;
      await this.pLayerAPI("updateUser",{
        field: "username",
        value: un
      });
    },
    async changePassword() {
      let pw = this.newPassword;
      await this.pLayerAPI("updateUser",{
        field: "password",
        value: pw
      });
    },
    async changeEmail() {
      let email = this.newEmail;
      await this.pLayerAPI("updateUser",{
        field: "email",
        value: email
      });
      await this.signOut();
    },
    resetAudioContext() {
      this.audioContext = new AudioContext();
      this.merger = this.audioContext.createChannelMerger(2);
      this.mixedAudio = this.audioContext.createMediaStreamDestination();
      this.merger.connect(this.mixedAudio);
      this.merger.connect(this.audioContext.destination);
    },
    async getLayerBuffer(layerID) {
      let data = await (await fetch(await getDownloadURL(ref(storage, layerID)))).arrayBuffer()
      return {
        id: layerID,
        user: layers[layerID].user,
        data: data.slice(),
        decoded_data: await this.audioContext.decodeAudioData(data)
      }
    }, 
    async getTrack(draftLayer="") {
      if(!Object.keys(tracks).length) return;
      this.busy = true;
      let trackLayers = tracks[this.trackID].layers.slice();
      if(draftLayer.length) trackLayers.push(draftLayer);
      this.draft = draftLayer;
      this.layerBuffers = await Promise.all(trackLayers.map(this.getLayerBuffer));
      this.artistNames = trackLayers.map((layerID) => users[layers[layerID]['user']]['displayName']);
      this.artistNames = [...new Set(this.artistNames)];
      this.trackName = tracks[this.trackID]['name'];
      this.seeker = 0;
      this.slider = 0;
      this.trackDuration = this.layerBuffers[0].decoded_data.duration;
      this.busy = false;
    },
    seekerInput(seek) {
      clearInterval(this.interval);
      this.seeker = parseFloat(seek);
      this.togglePlay();
      this.togglePlay();
    },
    updateSlider() {
      this.slider = this.seeker + this.audioContext.currentTime;
      if(this.slider > this.trackDuration) {
        clearInterval(this.interval);
      }
    },
    async forcePause() {
      if(!this.paused) await this.togglePlay();
    },
    async togglePlay() {
        if(this.paused) {
          this.resetAudioContext();
          for(const layerBuffer of this.layerBuffers) {
            let source = this.audioContext.createBufferSource();
            source.buffer = layerBuffer.decoded_data;
            source.connect(this.merger, 0, 0);
            source.connect(this.merger, 0, 1);
            source.start(0, this.seeker);
            this.layers.push(source);
          }
          this.interval = setInterval(this.updateSlider, 100);
        } else {
          clearInterval(this.interval);
          this.seeker += this.audioContext.currentTime;
          this.layers.forEach((node) => node.stop());
        }
      this.paused = !this.paused;
    },
    async toggleTrack(forward) {
      await this.forcePause();
      this.busy = true;
      if(forward) { this.trackIdx++; }
      else { 
        if(!this.trackIdx) this.trackIdx = Object.keys(tracks).length;
        this.trackIdx--;
      }
      this.trackIdx = this.trackIdx % Object.keys(tracks).length;
      this.trackID = Object.keys(tracks)[this.trackIdx];
      await this.getTrack();
      this.busy = false;
    },
    async post() {
      let self = this;
      await self.forcePause();
      self.busy = true;
      const uid = uuidv4();
      const layerPath = ref(storage, uid);
      const metadata = {
        customMetadata: {
          'name': self.newTrackName,
          'user': self.user.uid,
          'base': self.layering ? self.trackID : ""
        },
        contentType: 'audio/wav'
      }; 
      await uploadBytes(layerPath, self.layer, metadata);
      self.newTrackName = "";
      self.layer = null;
      self.layering = false;
      self.busy = false;
    },
    updateBoxes() {
      let self = this;
      let layersArray = Object.keys(layers).map((layerID) => layers[layerID]);
      let myLayers = layersArray.filter((layer) => layer.user === self.user.uid);
      let myBaseIDs = myLayers.filter((layer) => !layer.base.length).map((layer) => layer.bucket);
      let submissions = myLayers.filter((layer) => !layer.resolved);

      self.inbox = layersArray.filter((layer) => myBaseIDs.includes(layer.base) && !layer.resolved).map((layer) => {
        return {
          layerID: layer.bucket,
          userID: layer.user,
          baseID: layer.base
        }
      });

      self.outbox = submissions.map((layer) => { 
        return {
          layerID: layer.bucket,
          userID: layer.user,
          baseID: layer.base
        }  
      });
    },
    updateDiscography() {
      this.discography = Object.keys(tracks).filter((trackID) => layers[trackID].user == this.user.uid).map((t) => {return {trackID:t}});
      this.group_discography = Object.keys(tracks).map((t) => {return {trackID:t}});
    },
    async playDiscography(index) {
      await this.forcePause();
      this.trackID = this.discography[index].trackID;
      await this.getTrack();
    },
    async playGroupDiscography(index) {
      await this.forcePause();
      this.trackID = this.group_discography[index].trackID;
      await this.getTrack();
    },
    async layerGroupDiscography(index) {
      await this.forcePause();
      this.trackID = this.group_discography[index].trackID;
      await this.getTrack();
      this.layering = true;
      this.tabIndex = 0;
    },
    async playDraft(index, whichbox) {
      await this.forcePause();
      this.trackID = this[whichbox][index].baseID
      await this.getTrack(this[whichbox][index].layerID);
    },
    async resolveDraft(index, accept) {
      await this.forcePause();
      let layerID = this.inbox[index].layerID;
      let baseID = this.inbox[index].baseID;
      await this.pLayerAPI("resolveLayer",{
        layerID: layerID,
        baseID: baseID,
        accept: accept
      });
    },
    getLayerName(uid) {
      if(!uid || !Object.keys(layers).length) return;
      return layers[uid].name;
    },
    getLayerURL(buffer) {
      return window.URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
    },
    getBaseUser(uid) {
      if(!uid || !Object.keys(layers).length) return;
      return layers[uid].user;
    },
    getTrackName(uid) {
      if(!uid || !Object.keys(tracks).length) return;
      return tracks[uid].name;
    },
    getUserName(uid) {
      if(!uid || !Object.keys(users).length) return;
      return users[uid].displayName;
    },
    signinKeydownHandler(event) {
      if (event.which === 13 && this.stateCredentials) {
        this.signIn();
      }
    },
    usernameKeydownHandler(event) {
      if (event.which === 13 && this.stateUsername) {
        this.changeUsername(0);
      }
    },
    passwordKeydownHandler(event) {
      if (event.which === 13 && this.statePassword) {
        this.changePassword();
      }
    },
    emailKeydownHandler(event) {
      if (event.which === 13 && this.stateEmail) {
        this.changeEmail();
      }
    }
  }
});