let alertCallback = null;
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
    alertModal.style.display = "block";
    alertCallback = callback;
}

export function showConfirm(message, callback) {
    const confirmMessage = document.getElementById("confirmMessage");
    const confirmModal = document.getElementById("confirmModal");

    confirmMessage.innerHTML = message;
    confirmModal.style.display = "block";
    confirmCallback = callback;
}
