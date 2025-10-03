document.addEventListener("DOMContentLoaded", async () => {
  const statusContainer = document.getElementById("statusContainer");
  const path = window.location.pathname;
  const parts = path.split("/").filter(Boolean); // e.g., ['unsubscribe', 'some-id']

  if (parts.length < 2) {
    updateStatus(
      "error",
      "Invalid URL",
      "The link you followed seems to be broken. Please check the URL and try again."
    );
    return;
  }

  const action = parts[0];
  const subscriberId = parts[1];

  if (action === "unsubscribe") {
    updateStatus(
      "loading",
      "Unsubscribing...",
      "Please wait while we process your request."
    );

    try {
      const response = await fetch(
        `/api/notifications/unsubscribe/${subscriberId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        updateStatus(
          "success",
          "Successfully Unsubscribed",
          "You will no longer receive air quality notifications. You can subscribe again at any time from our app."
        );
      } else {
        throw new Error(data.error || "Could not process your request.");
      }
    } catch (error) {
      updateStatus(
        "error",
        "Unsubscribe Failed",
        `We encountered an error: ${error.message}. Please try again later or contact support.`
      );
    }
  } else {
    updateStatus(
      "error",
      "Unknown Action",
      "The link you followed is not recognized."
    );
  }
});

function updateStatus(type, title, message) {
  const statusContainer = document.getElementById("statusContainer");
  const icons = {
    loading: '<div class="spinner"></div>',
    success: '<div class="icon">✅</div>',
    error: '<div class="icon">❌</div>',
  };

  statusContainer.innerHTML = `
    ${icons[type]}
    <h1>${title}</h1>
    <p>${message}</p>
  `;
}