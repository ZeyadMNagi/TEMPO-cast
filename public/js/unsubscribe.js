document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("unsubscribeContainer");

  const renderStatus = (icon, title, message) => {
    container.innerHTML = `
      <div class="status-icon">${icon}</div>
      <h1>${title}</h1>
      <p>${message}</p>
      <a href="/" class="home-link">Return to Home</a>
    `;
  };

  // Initial state
  renderStatus(
    "⏳",
    "Processing Request",
    "We are processing your unsubscribe request. Please wait a moment..."
  );

  try {
    // Extract subscriber ID from the URL path, e.g., /unsubscribe/60d...
    const pathParts = window.location.pathname.split("/");
    const subscriberId = pathParts[pathParts.length - 1];

    if (!subscriberId || subscriberId.length < 24) {
      throw new Error("Invalid or missing subscriber ID in the URL.");
    }

    const response = await fetch(`/api/notifications/unsubscribe/${subscriberId}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle server-side errors (e.g., ID not found)
      throw new Error(data.error || "An unknown error occurred on the server.");
    }

    if (data.success) {
      // Success state
      renderStatus(
        "✅",
        "Successfully Unsubscribed",
        "You will no longer receive air quality notifications from Global TEMPO. We're sorry to see you go!"
      );
      // Clear local storage flags to allow re-subscription prompts
      localStorage.removeItem("aq_notifications_subscribed");
      localStorage.removeItem("aq_notification_subscriber_id");
    } else {
      // General failure state
      throw new Error(data.message || "Failed to process your request.");
    }
  } catch (error) {
    console.error("Unsubscribe error:", error);
    // Error state
    renderStatus(
      "❌",
      "Unsubscribe Failed",
      `There was a problem processing your request. Please try again or contact support if the issue persists. (Error: ${error.message})`
    );
  }
});