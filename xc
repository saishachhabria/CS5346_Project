let district = 2
// District initialization
radio.setGroup(district)
radio.setTransmitPower(1)
let microbits: string[];
let serialnos: number[];
microbits = []
serialnos = []
let mb_personal_warnings: string[]
mb_personal_warnings = []
let personal_warning = '';
let personal_warning_state = 0
let local_lockdown_state = 0
let global_lockdown_state = 0
let state = 0
let name = control.deviceName()
let temperature = -1
let msg_count = 0

// Protocol:
// General Message  -> (Type, Name, Temperature, #ofHops, ID)
// Personal Warning (0) -> (Message Type, Warning Type, Device Name, Activate/Deactivate, #ofHops)
// Local Lockdown   (1) -> (Message Type, Warning Type, Activate/Deactivate)
// Global Lockdown  (2) -> (Message Type, Warning Type, Activate/Deactivate)

function sendMessage() {
    // Broadcast its own temperature messages
    // (Type, Name, Temperature, #ofHops, ID)
    let message = "0," + name + "," + temperature + ",1," + msg_count
    msg_count++;
    radio.sendString(message)
}

function sendPersonalWarning(device_name: string) {
    // Broadcast a detected personal warning
    // (Message Type, Warning Type, Device Name, Activate / Deactivate, #ofHops)
    let personal_warning = "1,0," + device_name + ",1,1";
    radio.sendString(personal_warning);
}

function relayMessage(message: string) {
    // Relay messages that are received within the same radio setGroup
    let message_split = message.split(',');
    let hops = parseInt(message_split[3]) + 1;
    let new_message = message_split[0] + "," + message_split[1] + "," + message_split[2] + "," + hops + "," + message_split[4]
    radio.sendString(new_message);
}

function relayWarning(message: string) {
    let message_split = message.split(',');
    if (message_split[1] == '0') {
        // Personal warning -> Add 1 to the #ofHops
        let hops = parseInt(message_split[-1]) + 1;
        let new_message = message_split[0] + "," + message_split[1] + "," + message_split[2] + "," + hops;
        radio.sendString(new_message);
    }
    else {
        // Local and Global Lockdown -> Relay the same message
        radio.sendString(message);
    }
}

radio.onReceivedString(function (receivedString) {
    let list = receivedString.split(',')
    if (list[0] == '0') {
        // General message
        // Check if the temperature is within range to send a personal warning
        if (list[1] != name) {
            let temp = parseInt(list[2]);
            let hops = parseInt(list[3]);
            if (temp >= 36 && temp <= 38) {
                sendPersonalWarning(list[0]);
                if (hops == 1) {
                    alertPersonalWarning()
                }
            }
        }
        let saveCurrentMessage = 1
        for (let i = 0; i < microbits.length; i++) {
            if (microbits[i] == list[1]) {
                if (serialnos[i] == parseInt(list[4])) {
                    serialnos[i] = parseInt(list[4])
                    saveCurrentMessage = 0
                    break
                }
            }
        }
        if (saveCurrentMessage == 1) {
            microbits.push(list[1]);
            serialnos.push(parseInt(list[4]))
            relayMessage(receivedString);
        }
    }
    else if (list[0] == '1') {
        // Alert message
        // Checking for subtypes --> list[1]
        if (list[1] == '0') {
            // Personal Warning
            // (Message Type, Warning Type, Device Name, Activate/Deactivate, #ofHops)
            if (list[4] == '1') {

                basic.showNumber(8)
                // Show the personal warning if #ofHops = 1
                if (list[2] == name) {}
                // else {
                //     let check = 0
                //     let new_state = 0
                //     for(let i=0; i<mb_personal_warnings.length; i++) {
                //         let w = mb_personal_warnings[i].split(',')
                //         if (w[2] == list[2]) {
                //             if (w[3] != list[3]) {
                //                 mb_personal_warnings[i] = receivedString;
                //                 new_state = Math.max(new_state, parseInt(list[3]))
                //             }
                //             check = 1
                //         }
                //     }
                //     if (check == 0) {
                //         mb_personal_warnings.push(receivedString);
                //     }
                //     if (personal_warning_state != new_state) {
                //         alertPersonalWarning()
                //     }
                // }
                else if (list[2] == personal_warning) {
                    if (parseInt(list[3]) != personal_warning_state) {
                        personal_warning_state = parseInt(list[3])
                        alertPersonalWarning()
                    }
                }
                else {
                    // Check for not deactivating on random personal warnings
                    // Drawback: Handles only one personal warning at a time, so works for current setup, does not scale
                    personal_warning = list[2]
                    if (personal_warning_state != parseInt(list[3])) {
                        personal_warning_state = parseInt(list[3])
                        alertPersonalWarning()
                    }
                }
            }
        }
        else if (list[1] == '1') {
            // Local Lockdown
            if (local_lockdown_state != parseInt(list[2])) {
                local_lockdown_state = parseInt(list[2])
                alertLocalLockdown()
            }
        }
        else if (list[1] == '2') {
            // Global Lockdown
            if (global_lockdown_state != parseInt(list[2])) {
                global_lockdown_state = parseInt(list[2])
                alertGlobalLockdown()
            }
        }
        relayWarning(receivedString)
    }
})


basic.forever(function () {
    temperature = input.temperature()
    if (temperature < 30) state = 0
    else if (temperature <= 40) state = 1
    temperatureUpdate()
    sendMessage()
    pause(5000)
})

// LED update functions

function alertPersonalWarning() {
    // Personal Warning
    led.toggle(0, 2);
    led.toggle(4, 2);
}

function alertLocalLockdown() {
    // Local Lockdown Alarm
    led.toggle(0, 3);
    led.toggle(4, 3);
}

function alertGlobalLockdown() {
    // Global Lockdown Alarm
    led.toggle(0, 4);
    led.toggle(4, 4);
}

function temperatureUpdate() {
    if (state == 0) {
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 5; j++) {
                led.unplot(j, i)
            }
        }
    } else if (state == 1) {
        // Temperature between 30-40
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 5; j++) {
                led.unplot(j, i)
            }
        }
        let i = 0, j = 0;
        let highlight = temperature - 30;
        if (highlight > 10) { }
        while (highlight > 0) {
            led.plot(j, i);
            j += 1;
            if (j == 5) {
                j = 0;
                i++;
            }
            highlight--;
        }
    }
}


// Testing functions 
let template_personal_warning_activate = "1,0,saisha,1,1"; //(Message Type, Warning Type, Device Name, Activate/Deactivate, #ofHops)
let template_personal_warning_deactivate = "1,0,saisha,0,1";
let template_local_lockdown_activate = "1,1,1";   //(Message Type, Warning Type, Activate/Deactivate)
let template_local_lockdown_deactivate = "1,1,0";
let template_global_lockdown_activate = "1,2,1";  //(Message Type, Warning Type, Activate/Deactivate)
let template_global_lockdown_deactivate = "1,2,0";

// input.onButtonPressed(Button.A, function () {
//     radio.sendString(template_local_lockdown_activate);
// })

// input.onButtonPressed(Button.B, function () {
//     radio.sendString(template_local_lockdown_deactivate);
// })

// input.onButtonPressed(Button.AB, function () {
//     radio.sendString(template_global_lockdown);
// })