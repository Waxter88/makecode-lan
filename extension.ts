//% color=#0099CC weight=100 icon="\uf1eb"
//% block="LAN Multiplayer (P2P)"
namespace lanMultiplayer {
    let peerConnection: RTCPeerConnection;
    let dataChannel: RTCDataChannel;
    let onDataHandler: (data: string) => void = (data: string) => {
        console.log("Received:", data);
    };

    // For a LAN environment, no ICE servers are needed.
    const rtcConfig: RTCConfiguration = { iceServers: [] };

    /**
     * Host: Starts the connection process and creates a data channel.
     * Returns the SDP offer as a string.
     */
    //% block="start hosting and get offer"
    export function startHost(): Promise<string> {
        peerConnection = new RTCPeerConnection(rtcConfig);
        dataChannel = peerConnection.createDataChannel("gameChannel");

        // Set up event handlers for the data channel.
        dataChannel.onopen = () => { console.log("Data channel open"); };
        dataChannel.onmessage = (event) => { onDataHandler(event.data); };

        // When ICE gathering is complete, resolve with the SDP offer.
        return new Promise<string>(async (resolve, reject) => {
            try {
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);

                peerConnection.onicecandidate = (event) => {
                    // When candidate is null, ICE gathering is complete.
                    if (event.candidate === null) {
                        // Send the SDP offer as a JSON string.
                        resolve(JSON.stringify(peerConnection.localDescription));
                    }
                };
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * Host: Sets the answer received from the joining peer.
     * @param answer The answer SDP string received from the joiner.
     */
    //% block="set answer %answer"
    export async function setAnswer(answer: string): Promise<void> {
        const answerDesc = new RTCSessionDescription(JSON.parse(answer));
        await peerConnection.setRemoteDescription(answerDesc);
    }

    /**
     * Joiner: Uses the host's offer to create a connection and data channel.
     * Returns the SDP answer as a string.
     * @param offer The SDP offer string received from the host.
     */
    //% block="join host with offer %offer"
    export function joinHost(offer: string): Promise<string> {
        peerConnection = new RTCPeerConnection(rtcConfig);

        // Listen for the data channel created by the host.
        peerConnection.ondatachannel = (event) => {
            dataChannel = event.channel;
            dataChannel.onopen = () => { console.log("Data channel open"); };
            dataChannel.onmessage = (event) => { onDataHandler(event.data); };
        };

        return new Promise<string>(async (resolve, reject) => {
            try {
                const offerDesc = new RTCSessionDescription(JSON.parse(offer));
                await peerConnection.setRemoteDescription(offerDesc);

                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);

                peerConnection.onicecandidate = (event) => {
                    if (event.candidate === null) {
                        // Return the SDP answer as a JSON string.
                        resolve(JSON.stringify(peerConnection.localDescription));
                    }
                };
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * Sends a string message over the data channel.
     * @param data The data string to be sent.
     */
    //% block="send data %data"
    export function sendData(data: string): void {
        if (dataChannel && dataChannel.readyState === "open") {
            dataChannel.send(data);
        } else {
            console.error("Data channel is not open.");
        }
    }

    /**
     * Registers a handler function to be called when data is received.
     * @param handler The function that processes incoming data.
     */
    //% block="on data received"
    export function onDataReceived(handler: (data: string) => void): void {
        onDataHandler = handler;
    }
}
