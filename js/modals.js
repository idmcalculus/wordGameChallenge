/* let alertCallback = null;
let confirmCallback = null;

export function setupModals() {
    const alertModal = document.getElementById("alertModal");
    const alertMessage = document.getElementById("alertMessage");
    const alertClose = document.querySelector("#alertModal .close");
    const alertConfirmButton = document.getElementById("alertConfirmButton");

    const confirmModal = document.getElementById("confirmModal");
    const confirmMessage = document.getElementById("confirmMessage");
    const confirmClose = document.querySelector("#confirmModal .close");
    const confirmYesButton = document.getElementById("confirmYesButton");
    const confirmNoButton = document.getElementById("confirmNoButton");

    alertClose.onclick = () => {
        alertModal.style.display = "none";
    }

    alertConfirmButton.onclick = () => {
        alertModal.style.display = "none";
        if (alertCallback) {
            alertCallback();
            alertCallback = null;
        }
    }

    confirmClose.onclick = () => {
        confirmModal.style.display = "none";
    }

    confirmYesButton.onclick = () => {
        confirmModal.style.display = "none";
        if (confirmCallback) {
            confirmCallback(true);
            confirmCallback = null;
        }
    }

    confirmNoButton.onclick = () => {
        confirmModal.style.display = "none";
        if (confirmCallback) {
            confirmCallback(false);
            confirmCallback = null;
        }
    }

    window.onclick = (event) => {
        if (event.target == alertModal) {
            alertModal.style.display = "none";
        }
        if (event.target == confirmModal) {
            confirmModal.style.display = "none";
        }
    }
}

export function showAlert(message, callback) {
    const alertMessage = document.getElementById("alertMessage");
    const alertModal = document.getElementById("alertModal");

    alertMessage.innerHTML = message;
    alertModal.style.display = "flex";
	alertModal.style.alignItems = "center";
	alertModal.style.justifyContent = "center";
    alertCallback = callback;
}

export function showConfirm(message, callback) {
    const confirmMessage = document.getElementById("confirmMessage");
    const confirmModal = document.getElementById("confirmModal");

    confirmMessage.innerHTML = message;
    confirmModal.style.display = "flex";
	confirmModal.style.alignItems = "center";
	confirmModal.style.justifyContent = "center";
    confirmCallback = callback;
}
 */

let alertCallback = null;
let confirmCallback = null;

function setupModal(modalId, closeSelector, confirmButtonSelector, callbackType) {
    const modal = document.getElementById(modalId);
    const closeModal = document.querySelector(closeSelector);
    const confirmButton = confirmButtonSelector ? document.getElementById(confirmButtonSelector) : null;

    closeModal.onclick = () => {
        modal.style.display = "none";
    };

    if (confirmButton) {
        confirmButton.onclick = () => {
            modal.style.display = "none";
            if (callbackType === 'alert' && alertCallback) {
                alertCallback();
                alertCallback = null;
            }
        };
    }

    return modal;
}

function handleWindowClick(event, modal) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

export function setupModals() {
    const alertModal = setupModal("alertModal", "#alertModal .close", "alertConfirmButton", 'alert');
    const confirmModal = setupModal("confirmModal", "#confirmModal .close", null, 'confirm');

    const confirmYesButton = document.getElementById("confirmYesButton");
    const confirmNoButton = document.getElementById("confirmNoButton");

    confirmYesButton.onclick = () => {
        confirmModal.style.display = "none";
        if (confirmCallback) {
            confirmCallback(true);
            confirmCallback = null;
        }
    };

    confirmNoButton.onclick = () => {
        confirmModal.style.display = "none";
        if (confirmCallback) {
            confirmCallback(false);
            confirmCallback = null;
        }
    };

    window.onclick = (event) => {
        handleWindowClick(event, alertModal);
        handleWindowClick(event, confirmModal);
    };
}

function showModal(modalId, messageId, message, callbackRef, callbackType, displayStyle = "flex") {
    const modal = document.getElementById(modalId);
    const messageElement = document.getElementById(messageId);

    messageElement.innerHTML = message;
    modal.style.display = displayStyle;
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";

    if (callbackType === 'alert') {
        alertCallback = callbackRef;
    } else if (callbackType === 'confirm') {
        confirmCallback = callbackRef;
    }
}

export function showAlert(message, callback) {
    showModal("alertModal", "alertMessage", message, callback, 'alert');
}

export function showConfirm(message, callback) {
    showModal("confirmModal", "confirmMessage", message, callback, 'confirm');
}