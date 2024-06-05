let alertCallback = null;

export function setupModals() {
    const alertModal = document.getElementById("alertModal");
    const alertMessage = document.getElementById("alertMessage");
    const alertClose = document.querySelector("#alertModal .close");
    const alertResetButton = document.getElementById("alertResetButton");

    alertClose.onclick = () => {
        alertModal.style.display = "none";
    };

    alertResetButton.onclick = () => {
        alertModal.style.display = "none";
        if (alertCallback) {
            alertCallback();
            alertCallback = null;
        }
    };

    window.onclick = (event) => {
        if (event.target == alertModal) {
            alertModal.style.display = "none";
        }
    };
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