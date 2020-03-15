const NUMBER_OF_PRE_KEYS = 2; 
const SERVER_BASE_URL = window.location.href;
const KeyHelper = window.libsignal.KeyHelper;
class Signal {
	constructor(deviceId) {
		this.store = new window.SignalProtocolStore();
		this.idKeyPair; {};
		this.registrationId = KeyHelper.generateRegistrationId();
		this.deviceId = deviceId;
		this.preKeyObjects = {}
		this.preKeyObjectsToSend = []
		this.signedPreKeyObject = {}
		this.identifiers = {};

		this.contacts = [];

		this.store.put("registrationId", this.registrationId);
	}

	init = async () => {
		const idKeyPair = await KeyHelper.generateIdentityKeyPair();
		this.store.put('identityKey', idKeyPair);

		let preKeyPromises = [];
		for (let i = 0; i < NUMBER_OF_PRE_KEYS; i++) {
			preKeyPromises.push(KeyHelper.generatePreKey(this.registrationId + i + 1));
		}

		const preKeys = await Promise.all(preKeyPromises);
		preKeys.forEach(preKeyObj => {
			 this.preKeyObjectsToSend.push({
				id: preKeyObj.keyId,
				key: window.arrBuffToBase64(preKeyObj.keyPair.pubKey)
			}) 
			this.store.storePreKey(preKeyObj.keyId, preKeyObj.keyPair);
		})

		const signedPreKey = await KeyHelper.generateSignedPreKey(idKeyPair, this.registrationId - 1)
		this.signedPreKeyObject = signedPreKey;

		this.store.storeSignedPreKey(signedPreKey.keyId, signedPreKey.keyPair);
		
		return this.store;
	}
	

	registerUser = async () => {
		const url = SERVER_BASE_URL + 'send';
		const body = {
			type: "init",
			deviceId: this.deviceId,
			registrationId: this.registrationId,
			identityKey: window.arrBuffToBase64(this.store.getIdentityKeyPair().pubKey),
			signedPreKey: {
				id: this.signedPreKeyObject.keyId,
				key: window.arrBuffToBase64(this.signedPreKeyObject.keyPair.pubKey),
				signature: window.arrBuffToBase64(this.signedPreKeyObject.signature),
			},
			preKeys: this.preKeyObjectsToSend
		}
		console.log(body);

		return window.sendRequest(url, body)
	}
}


document.addEventListener('DOMContentLoaded', async e => {
	const signal = new Signal(123);

	const store = await signal.init();
	const res = await signal.registerUser();
	console.log(res);
});

