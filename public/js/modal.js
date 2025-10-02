function showNotificationModalOnLoad() {
  const hasSubscribed = localStorage.getItem("aq_notifications_subscribed");
  const lastShown = localStorage.getItem("aq_notification_modal_shown");

  if (hasSubscribed) return;

  if (lastShown) {
    const daysSinceShown =
      (Date.now() - parseInt(lastShown)) / (1000 * 60 * 60 * 24);
    if (daysSinceShown < 7) return;
  }

  setTimeout(() => {
    document.getElementById("notificationModal").classList.add("show");
    localStorage.setItem("aq_notification_modal_shown", Date.now().toString());
  }, 10000);
}

function showNotificationModalForPoorAQI(aqi) {
  if (aqi >= 101) {
    const hasSubscribed = localStorage.getItem("aq_notifications_subscribed");
    if (!hasSubscribed) {
      document.getElementById("notificationModal").classList.add("show");
    }
  }
}

function useCurrentLocationForNotifications() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      document.getElementById("homeLocation").value = `${lat.toFixed(
        4
      )}, ${lon.toFixed(4)}`;
    },
    (error) => {
      alert("Unable to get your location. Please enter it manually.");
    }
  );
}

function showNotificationPreferences() {
  document.getElementById("notificationModal").classList.add("show");
}

window.showNotificationPreferences = showNotificationPreferences;
window.showNotificationModalForPoorAQI = showNotificationModalForPoorAQI;

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "none";
  }
}

// Auto-trigger notification modal based on AQI
function checkAndShowNotificationPrompt(aqi, cityName) {
  // Don't show if already subscribed
  const hasSubscribed = localStorage.getItem('aq_notifications_subscribed');
  if (hasSubscribed) return;

  // Show for poor air quality
  if (aqi >= 101) {
    // Show after 3 seconds when AQI is unhealthy
    setTimeout(() => {
      const shouldShow = confirm(
        `⚠️ Air quality in ${cityName} is ${getAQICategory(aqi).label} (AQI: ${aqi}).\n\n` +
        `Would you like to receive personalized air quality alerts to protect your health?`
      );
      
      if (shouldShow) {
        showNotificationPreferences();
      }
    }, 3000);
  }
}

// Add notification prompt button to health section
function addNotificationPromptToHealthSection() {
  const healthSection = document.getElementById('healthSection');
  if (!healthSection) return;

  // Check if already subscribed
  const hasSubscribed = localStorage.getItem('aq_notifications_subscribed');
  if (hasSubscribed) {
    // Show subscribed status
    const statusDiv = document.createElement('div');
    statusDiv.className = 'notification-status';
    statusDiv.innerHTML = `
      <div style="background: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; padding: 15px; margin: 15px 0;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 24px;">✅</span>
          <div>
            <strong style="color: #059669;">You're subscribed to alerts!</strong>
            <p style="margin: 5px 0 0 0; font-size: 0.9em; color: #047857;">
              We'll notify you when air quality changes in your area.
              <button onclick="manageNotificationPreferences()" style="color: #059669; text-decoration: underline; background: none; border: none; cursor: pointer; padding: 0; margin-left: 5px;">
                Manage preferences
              </button>
            </p>
          </div>
        </div>
      </div>
    `;
    healthSection.insertBefore(statusDiv, healthSection.firstChild);
  } else {
    // Show subscribe prompt
    const promptDiv = document.createElement('div');
    promptDiv.className = 'notification-prompt';
    promptDiv.innerHTML = `
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; padding: 20px; margin: 15px 0; color: white;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 15px;">
          <div style="flex: 1;">
            <h4 style="margin: 0 0 8px 0; font-size: 1.1em;">🔔 Stay Protected</h4>
            <p style="margin: 0; font-size: 0.95em; opacity: 0.95;">
              Get personalized air quality alerts based on your health profile and location.
            </p>
          </div>
          <button 
            onclick="showNotificationPreferences()" 
            style="background: white; color: #667eea; border: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: transform 0.2s;"
            onmouseover="this.style.transform='scale(1.05)'"
            onmouseout="this.style.transform='scale(1)'"
          >
            Subscribe Now
          </button>
        </div>
      </div>
    `;
    healthSection.insertBefore(promptDiv, healthSection.firstChild);
  }
}

// Manage existing subscription
function manageNotificationPreferences() {
  const subscriberId = localStorage.getItem('aq_notification_subscriber_id');
  if (subscriberId) {
    // Load existing preferences and open modal
    showNotificationPreferences();
    
    // Optionally load and populate existing preferences
    fetch(`/api/notifications/preferences/${subscriberId}`)
      .then(response => response.json())
      .then(data => {
        if (data.success && data.subscriber) {
          populateNotificationForm(data.subscriber);
        }
      })
      .catch(console.error);
  } else {
    showNotificationPreferences();
  }
}

// Populate form with existing preferences
function populateNotificationForm(subscriber) {
  // Email and phone
  const userEmailInput = document.getElementById('userEmail');
  if (userEmailInput) userEmailInput.value = subscriber.email || '';
  
  const userPhoneInput = document.getElementById('userPhone');
  if (userPhoneInput) userPhoneInput.value = subscriber.phone || '';
  
  // Notification methods
  const notifyEmailCheckbox = document.querySelector('input[name="notifyEmail"]');
  if (notifyEmailCheckbox) notifyEmailCheckbox.checked = subscriber.notificationMethods?.email || false;
  
  const notifySmsCheckbox = document.querySelector('input[name="notifySMS"]');
  if (notifySmsCheckbox) notifySmsCheckbox.checked = subscriber.notificationMethods?.sms || false;
  
  const notifyWhatsAppCheckbox = document.querySelector('input[name="notifyWhatsApp"]');
  if (notifyWhatsAppCheckbox) notifyWhatsAppCheckbox.checked = subscriber.notificationMethods?.whatsapp || false;
  
  // Frequency
  const freqRadio = document.querySelector(`input[name="frequency"][value="${subscriber.frequency}"]`);
  if (freqRadio) freqRadio.checked = true;
  
  // Health conditions
  subscriber.healthProfile?.conditions?.forEach(condition => {
    const checkbox = document.querySelector(`input[name="condition_${condition}"]`);
    if (checkbox) checkbox.checked = true;
  });
  
  // Age group
  const ageSelect = document.getElementById('ageGroup');
  if (ageSelect && subscriber.healthProfile?.ageGroup) {
    ageSelect.value = subscriber.healthProfile.ageGroup;
  }
  
  // Other health factors
  const pregnantCheckbox = document.querySelector('input[name="pregnant"]');
  if (pregnantCheckbox) pregnantCheckbox.checked = subscriber.healthProfile?.pregnant || false;
  
  const outdoorWorkerCheckbox = document.querySelector('input[name="outdoor_worker"]');
  if (outdoorWorkerCheckbox) outdoorWorkerCheckbox.checked = subscriber.healthProfile?.outdoorWorker || false;
  
  const athleteCheckbox = document.querySelector('input[name="athlete"]');
  if (athleteCheckbox) athleteCheckbox.checked = subscriber.healthProfile?.athlete || false;
  
  // Threshold
  const thresholdRadio = document.querySelector(`input[name="threshold"][value="${subscriber.threshold}"]`);
  if (thresholdRadio) thresholdRadio.checked = true;
  
  // Locations
  if (subscriber.locations?.home) {
    const homeLocationInput = document.getElementById('homeLocation');
    if (homeLocationInput) homeLocationInput.value = subscriber.locations.home;
  }
  if (subscriber.locations?.work) {
    const workLocationInput = document.getElementById('workLocation');
    if (workLocationInput) workLocationInput.value = subscriber.locations.work;
  }
}

// Enhanced form submission with API integration
function setupNotificationFormSubmission() {
  const form = document.getElementById('notificationForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = '⏳ Subscribing...';
    
    try {
      // Gather form data
      const formData = new FormData(form);
      const preferences = {
        email: formData.get('email'),
        phone: formData.get('phone'),
        notificationMethods: {
          email: formData.get('notifyEmail') === 'on',
          sms: formData.get('notifySMS') === 'on',
          whatsapp: formData.get('notifyWhatsApp') === 'on'
        },
        frequency: formData.get('frequency'),
        healthProfile: {
          conditions: [],
          ageGroup: formData.get('ageGroup'),
          pregnant: formData.get('pregnant') === 'yes',
          outdoorWorker: formData.get('outdoor_worker') === 'yes',
          athlete: formData.get('athlete') === 'yes'
        },
        threshold: formData.get('threshold'),
        locations: {
          home: formData.get('homeLocation'),
          work: formData.get('workLocation')
        }
      };
      
      // Gather health conditions
      ['asthma', 'copd', 'heart', 'allergies', 'other'].forEach(condition => {
        if (formData.get(`condition_${condition}`)) {
          preferences.healthProfile.conditions.push(condition);
        }
      });
      
      // Check if updating or creating
      let subscriberId = localStorage.getItem('aq_notification_subscriber_id');

      // Validate if the stored ID is a valid MongoDB ObjectId (24 hex chars)
      const isValidObjectId = subscriberId && /^[0-9a-fA-F]{24}$/.test(subscriberId);
      if (!isValidObjectId) {
        localStorage.removeItem('aq_notification_subscriber_id');
        subscriberId = null; // Force a new subscription
      }

      let endpoint = subscriberId 
        ? `/api/notifications/update/${subscriberId}`
        : '/api/notifications/subscribe';
      let method = subscriberId ? 'PUT' : 'POST';
      
      // Send to backend
      let response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      });
      
      if (!response.ok && (response.status === 404 || response.status === 400)) {
        console.log('Subscriber ID not found on server. Clearing local ID and creating a new subscription.');
        localStorage.removeItem('aq_notification_subscriber_id');
        
        // Switch to POST and try again
        endpoint = '/api/notifications/subscribe';
        method = 'POST';
        // Re-fetch with the correct method
        response = await fetch(endpoint, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(preferences)
        });
      }

      const data = await response.json();

      if (data.success) {
        // Store subscriber ID
        if (data.subscriberId) {
          localStorage.setItem('aq_notification_subscriber_id', data.subscriberId);
        }
        localStorage.setItem('aq_notifications_subscribed', 'true');
        localStorage.setItem('aq_notification_preferences', JSON.stringify(preferences));
        
        // Show success message
        form.style.display = 'none';
        document.getElementById('notificationSuccess').style.display = 'block';
        
        // Update UI
        setTimeout(() => {
          addNotificationPromptToHealthSection();
        }, 3000);

        console.log('📬 Notification preferences:', preferences);
        console.log(data)
        
        console.log('✅ Notification preferences saved successfully');
      } else {
        throw new Error(data.error || 'Failed to save preferences');
      }
      
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('There was an error saving your preferences. Please try again.\n\nError: ' + error.message);
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  });
}

function enhanceDisplayIntegratedAirQualityData(originalFunction) {
  return function(...args) {
    // Call original function
    const result = originalFunction.apply(this, args);
    
    // Get AQI and city name from the display
    const aqiValue = parseInt(document.getElementById('aqiValue')?.textContent);
    const cityName = document.getElementById('cityName')?.textContent.split('(')[0].trim();
    
    // Add notification prompt to health section
    addNotificationPromptToHealthSection();
    
    // Check if should show notification modal
    if (!isNaN(aqiValue) && cityName) {
      checkAndShowNotificationPrompt(aqiValue, cityName);
    }
    
    return result;
  };
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  showNotificationModalOnLoad();

  // Setup form submission
  setupNotificationFormSubmission();
  
  // Enhance existing function if it exists
  if (typeof displayIntegratedAirQualityData === 'function') {
    const original = displayIntegratedAirQualityData;
    displayIntegratedAirQualityData = function(...args) {
      const result = original.apply(this, args);
      
      // Add notification features after display
      setTimeout(() => {
        const aqiValue = parseInt(document.getElementById('aqiValue')?.textContent);
        const cityName = document.getElementById('cityName')?.textContent.split('(')[0].trim();
        
        addNotificationPromptToHealthSection();
        
        if (!isNaN(aqiValue) && cityName) {
          checkAndShowNotificationPrompt(aqiValue, cityName);
        }
      }, 500);
      
      return result;
    };
  }
});
