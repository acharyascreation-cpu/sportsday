/* Page interactions and Supabase-backed registration and organiser access. */
(() => {
  const body = document.body;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js-motion");

  // Keep the current page visible in the shared navigation.
  const page = body.dataset.page;
  document.querySelectorAll(".nav-links a").forEach((link) => {
    const target = link.getAttribute("href");
    const filename = target ? target.split("/").pop().replace(".html", "") : "";
    if ((filename === "index" ? "home" : filename) === page) link.setAttribute("aria-current", "page");
  });

  // Mobile navigation opens as a compact panel below the sticky masthead.
  const menuButton = document.querySelector(".menu-toggle");
  const menu = document.getElementById("primary-navigation");
  if (menuButton && menu) {
    const closeMenu = () => {
      menu.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Open navigation");
    };
    menuButton.addEventListener("click", () => {
      const open = menuButton.getAttribute("aria-expanded") !== "true";
      menu.classList.toggle("open", open);
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    });
    menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 800) closeMenu();
    });
  }

  // Reveal section content as it enters view; reduced-motion users see it immediately.
  const revealItems = document.querySelectorAll(".reveal");
  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("seen"));
  } else {
    revealItems.forEach((item) => item.classList.add("pending"));
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.remove("pending");
          entry.target.classList.add("seen");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  // The reference uses a motion toggle for its running track scene and ticker.
  const motionButton = document.querySelector(".scene-toggle");
  if (motionButton) {
    motionButton.addEventListener("click", () => {
      const paused = motionButton.getAttribute("aria-pressed") !== "true";
      motionButton.setAttribute("aria-pressed", String(paused));
      body.dataset.motionPaused = String(paused);
      motionButton.textContent = paused ? "Resume motion" : "Pause motion";
    });
    if (reducedMotion) {
      body.dataset.motionPaused = "true";
      motionButton.setAttribute("aria-pressed", "true");
      motionButton.textContent = "Resume motion";
    }
  }

  // Show the number of days remaining until Sports Day.
  const countdown = document.getElementById("countdown");
  if (countdown) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDay = new Date(2026, 9, 17);
    const days = Math.ceil((eventDay.getTime() - today.getTime()) / 86400000);
    countdown.textContent = days > 0 ? `${days} DAYS TO THE START` : days === 0 ? "EVENT DAY IS HERE" : "SPORTS DAY 2026";
  }

  // Filter the event catalogue by track or field category.
  const eventFilterButtons = document.querySelectorAll("[data-event-filter]");
  const eventCards = document.querySelectorAll("[data-event-card]");
  if (eventFilterButtons.length && eventCards.length) {
    const params = new URLSearchParams(window.location.search);
    const requestedType = (params.get("type") || "").toLowerCase();
    const initialFilter = requestedType === "track" ? "track" : requestedType === "field" ? "field" : "all";
    const applyEventFilter = (filter) => {
      eventFilterButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.eventFilter === filter)));
      eventCards.forEach((card) => { card.hidden = filter !== "all" && card.dataset.kind !== filter; });
    };
    eventFilterButtons.forEach((button) => button.addEventListener("click", () => applyEventFilter(button.dataset.eventFilter)));
    applyEventFilter(initialFilter);
  }

  // Build the schedule from confirmed event/division combinations. Times remain pending.
  const scheduleBody = document.getElementById("schedule-body");
  if (scheduleBody) {
    const scheduleEvents = ["100m", "200m", "400m", "800m", "Long Jump", "High Jump", "Discus Throw", "Shot Put"];
    const divisions = ["Degree Boys", "Degree Girls", "PUC Boys", "PUC Girls"];
    const rows = [];
    scheduleEvents.forEach((eventName) => {
      divisions.forEach((division) => {
        if (eventName === "800m" && division.endsWith("Girls")) return;
        rows.push({ eventName, division });
      });
    });
    const eventSelect = document.getElementById("schedule-event-filter");
    const divisionSelect = document.getElementById("schedule-division-filter");
    const renderSchedule = () => {
      scheduleBody.replaceChildren();
      rows.filter((row) => (eventSelect.value === "all" || row.eventName === eventSelect.value)
        && (divisionSelect.value === "all" || row.division === divisionSelect.value))
        .forEach((row) => {
          const tr = document.createElement("tr");
          ["To be announced", row.eventName, row.division, "Mangala Stadium, Mangalore"].forEach((value) => {
            const td = document.createElement("td");
            td.textContent = value;
            tr.appendChild(td);
          });
          const statusCell = document.createElement("td");
          const status = document.createElement("span");
          status.className = "status-pill";
          status.textContent = "Pending";
          statusCell.appendChild(status);
          tr.appendChild(statusCell);
          scheduleBody.appendChild(tr);
        });
    };
    [eventSelect, divisionSelect].forEach((select) => select.addEventListener("change", renderSchedule));
    renderSchedule();
  }

  // Validate registration in the browser, then save it through the guarded database function.
  const form = document.getElementById("registration-form");
  if (form) {
    const courseSelect = document.getElementById("student-course");
    const yearSelect = document.getElementById("student-year");
    const genderSelect = document.getElementById("student-gender");
    const eventInputs = Array.from(form.querySelectorAll('input[name="events"]'));
    const errorMessage = document.getElementById("form-error");
    const selectedSummary = document.getElementById("selection-summary");

    const updateYears = () => {
      yearSelect.replaceChildren();
      const course = courseSelect.value;
      if (!course) {
        yearSelect.add(new Option("Select course first", ""));
        yearSelect.disabled = true;
        return;
      }
      yearSelect.disabled = false;
      yearSelect.add(new Option("Select year", ""));
      const years = course === "PUC" ? ["PUC I Year", "PUC II Year"] : ["I Year", "II Year", "III Year"];
      years.forEach((year) => yearSelect.add(new Option(year, year)));
    };

    const updateEventOptions = () => {
      const femaleStudent = genderSelect.value === "Female";
      const maleOnlyEvent = eventInputs.find((input) => input.hasAttribute("data-male-only"));
      if (femaleStudent && maleOnlyEvent) maleOnlyEvent.checked = false;
      const chosen = eventInputs.filter((input) => input.checked);
      const trackCount = chosen.filter((input) => input.dataset.kind === "track").length;
      const fieldCount = chosen.filter((input) => input.dataset.kind === "field").length;
      const totalCount = chosen.length;
      document.getElementById("track-count").textContent = String(trackCount);
      document.getElementById("field-count").textContent = String(fieldCount);
      document.getElementById("total-count").textContent = String(totalCount);

      eventInputs.forEach((input) => {
        const categoryLimit = input.dataset.kind === "track" ? trackCount >= 2 : fieldCount >= 2;
        const atOverallLimit = totalCount >= 3;
        const maleOnlyRule = input.hasAttribute("data-male-only") && femaleStudent;
        input.disabled = maleOnlyRule || (!input.checked && (categoryLimit || atOverallLimit));
      });

      const finalChosen = eventInputs.filter((input) => input.checked).map((input) => input.value);
      selectedSummary.replaceChildren();
      if (finalChosen.length === 0) {
        const empty = document.createElement("span");
        empty.textContent = "No events selected";
        selectedSummary.appendChild(empty);
      } else {
        finalChosen.forEach((eventName) => {
          const chip = document.createElement("span");
          chip.textContent = eventName;
          selectedSummary.appendChild(chip);
        });
      }
    };

    courseSelect.addEventListener("change", updateYears);
    genderSelect.addEventListener("change", updateEventOptions);
    eventInputs.forEach((input) => input.addEventListener("change", () => {
      errorMessage.textContent = "";
      updateEventOptions();
    }));

    const requestedEvent = new URLSearchParams(window.location.search).get("event");
    if (requestedEvent) {
      const matchingEvent = eventInputs.find((input) => input.value.toLowerCase() === requestedEvent.toLowerCase());
      if (matchingEvent) matchingEvent.checked = true;
    }
    updateEventOptions();

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      errorMessage.textContent = "";
      if (!form.reportValidity()) return;

      const chosen = eventInputs.filter((input) => input.checked);
      if (chosen.length === 0) {
        errorMessage.textContent = "Choose at least one event to continue.";
        return;
      }
      if (genderSelect.value === "Female" && chosen.some((input) => input.hasAttribute("data-male-only"))) {
        errorMessage.textContent = "The 800m is available to male students only.";
        return;
      }

      const submitButton = form.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.innerHTML;
      submitButton.disabled = true;
      submitButton.textContent = "Submitting…";

      try {
        const client = window.getSupabaseClient();
        const courseValues = { "B.Com": "BCom", "B.ASLP": "BSALP" };
        const { data, error } = await client.rpc("register_student", {
          p_name: document.getElementById("student-name").value.trim(),
          p_usn: document.getElementById("student-usn").value.trim(),
          p_course: courseValues[courseSelect.value] || courseSelect.value,
          p_year: yearSelect.value,
          p_gender: genderSelect.value,
          p_events: chosen.map((input) => input.value)
        });

        if (error) {
          const details = (error.message || "").toLowerCase();
          errorMessage.textContent = error.code === "23505" || details.includes("duplicate key")
            ? "That student ID is already registered."
            : error.message || "Registration could not be submitted. Please try again.";
          return;
        }

        const confirmation = {
          reference: data && data.registrationId ? String(data.registrationId) : "",
          events: chosen.map((input) => input.value)
        };
        const confirmationKey = "sportsDayRegistrationConfirmation";
        let confirmationUrl = "registration-success.html";
        try {
          sessionStorage.setItem(confirmationKey, JSON.stringify(confirmation));
        } catch {
          const params = new URLSearchParams();
          if (confirmation.reference) params.set("reference", confirmation.reference);
          params.set("events", confirmation.events.join(","));
          confirmationUrl += `?${params.toString()}`;
        }
        window.location.assign(confirmationUrl);
      } catch (submissionError) {
        errorMessage.textContent = submissionError.message || "Registration service is unavailable. Please try again later.";
      } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
      }
    });
  }

  const confirmationPage = document.getElementById("registration-confirmation");
  if (confirmationPage) {
    let confirmation = null;
    try {
      const stored = sessionStorage.getItem("sportsDayRegistrationConfirmation");
      if (stored) confirmation = JSON.parse(stored);
    } catch {
      confirmation = null;
    }
    if (!confirmation) {
      const params = new URLSearchParams(window.location.search);
      const events = (params.get("events") || "").split(",").filter(Boolean);
      if (params.has("reference") || events.length) {
        confirmation = { reference: params.get("reference") || "", events };
      }
    }
    if (!confirmation || !Array.isArray(confirmation.events) || confirmation.events.length === 0) {
      window.location.replace("register.html");
      return;
    }
    document.getElementById("confirmation-events").textContent = confirmation.events.join(", ");
    const reference = document.getElementById("confirmation-reference");
    if (confirmation.reference) reference.textContent = confirmation.reference;
    else reference.closest("p").hidden = true;
  }

  const passwordToggle = document.querySelector(".password-toggle");
  if (passwordToggle) {
    const passwordInput = document.getElementById(passwordToggle.getAttribute("aria-controls"));
    passwordToggle.addEventListener("click", () => {
      const revealPassword = passwordInput.type === "password";
      passwordInput.type = revealPassword ? "text" : "password";
      passwordToggle.textContent = revealPassword ? "Hide" : "Show";
      passwordToggle.setAttribute("aria-pressed", String(revealPassword));
    });
  }

  const organiserLoginForm = document.getElementById("organiser-login-form");
  if (organiserLoginForm) {
    organiserLoginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = document.getElementById("organiser-login-message");
      if (!organiserLoginForm.reportValidity()) return;

      const button = organiserLoginForm.querySelector('button[type="submit"]');
      const originalButtonText = button.innerHTML;
      button.disabled = true;
      button.textContent = "Signing in…";
      message.textContent = "";

      try {
        const client = window.getSupabaseClient();
        const { error: signInError } = await client.auth.signInWithPassword({
          email: document.getElementById("organiser-email").value.trim(),
          password: document.getElementById("organiser-password").value
        });

        if (signInError) {
          message.textContent = "Email or password was not recognised.";
          return;
        }

        const { data: isAdmin, error: accessError } = await client.rpc("is_sports_day_admin");
        if (accessError || isAdmin !== true) {
          await client.auth.signOut();
          message.textContent = "This account does not have Sports Day organiser access.";
          return;
        }

        window.location.href = "organiser-dashboard.html";
      } catch (loginError) {
        message.textContent = loginError.message || "The organiser service is unavailable. Please try again.";
      } finally {
        button.disabled = false;
        button.innerHTML = originalButtonText;
      }
    });
  }

  // Protect the organiser dashboard behind Supabase Auth and the admin-role check.
  const dashboardStatus = document.getElementById("dashboard-status");
  if (dashboardStatus) {
    const eventCategories = {
      track: ["100m", "200m", "400m", "800m"],
      field: ["Long Jump", "High Jump", "Discus Throw", "Shot Put"]
    };
    const groupInfo = {
      "degree-boys": { label: "Degree Boys", isPuc: false, gender: "Male" },
      "degree-girls": { label: "Degree Girls", isPuc: false, gender: "Female" },
      "puc-boys": { label: "PUC Boys", isPuc: true, gender: "Male" },
      "puc-girls": { label: "PUC Girls", isPuc: true, gender: "Female" }
    };
    let client;
    let students = [];
    let selectedGroup = "degree-boys";
    let selectedEvent = "";
    const errorStatus = (message) => {
      dashboardStatus.textContent = message;
      dashboardStatus.classList.add("error");
    };
    const getGroupStudents = (groupKey) => {
      const group = groupInfo[groupKey];
      return students.filter((student) => (student.course === "PUC") === group.isPuc && student.gender === group.gender);
    };
    const updateGroupCounts = () => {
      document.getElementById("total-students").textContent = String(students.length);
      document.getElementById("degree-students").textContent = String(students.filter((student) => student.course !== "PUC").length);
      document.getElementById("puc-students").textContent = String(students.filter((student) => student.course === "PUC").length);
      document.querySelectorAll("[data-group]").forEach((button) => {
        const count = getGroupStudents(button.dataset.group).length;
        button.querySelector("span").textContent = `${count} ${count === 1 ? "student" : "students"}`;
        button.setAttribute("aria-pressed", String(button.dataset.group === selectedGroup));
      });
      document.getElementById("selected-group-label").textContent = groupInfo[selectedGroup].label;
    };
    const safeCell = (value) => {
      const textValue = String(value ?? "");
      const safeValue = /^[=+\-@\t\r]/.test(textValue) ? `'${textValue}` : textValue;
      return `"${safeValue.replace(/"/g, '""')}"`;
    };
    const selectedParticipants = () => {
      const query = document.getElementById("participant-search").value.trim().toLowerCase();
      return getGroupStudents(selectedGroup)
        .filter((student) => student.events.includes(selectedEvent))
        .filter((student) => !query || [student.name, student.usn, student.course, student.year, student.gender]
          .some((value) => String(value).toLowerCase().includes(query)));
    };
    const renderParticipants = () => {
      const tableWrap = document.getElementById("participant-table-wrap");
      const empty = document.getElementById("participants-empty");
      const table = document.getElementById("participant-table");
      const downloadButton = document.getElementById("download-event-csv");
      const heading = document.getElementById("participant-heading");
      table.replaceChildren();
      downloadButton.disabled = !selectedEvent;
      if (!selectedEvent) {
        heading.textContent = "Participants";
        tableWrap.hidden = true;
        empty.hidden = false;
        empty.textContent = "Select an event above to view its participants.";
        return;
      }
      heading.textContent = `${groupInfo[selectedGroup].label} · ${selectedEvent}`;
      const participants = selectedParticipants();
      empty.hidden = participants.length > 0;
      empty.textContent = document.getElementById("participant-search").value.trim()
        ? "No matching participants in this division."
        : "No registrations for this event in this division.";
      tableWrap.hidden = participants.length === 0;
      participants.forEach((student, index) => {
        const row = document.createElement("tr");
        [String(index + 1), student.name, student.usn,
          `${student.courseLabel} · ${student.year}`, student.gender]
          .forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
          });
        table.appendChild(row);
      });
    };
    const renderEventLists = () => {
      Object.entries(eventCategories).forEach(([category, eventNames]) => {
        const list = document.getElementById(category === "track" ? "track-event-list" : "field-event-list");
        list.replaceChildren();
        eventNames.forEach((eventName) => {
          const count = getGroupStudents(selectedGroup).filter((student) => student.events.includes(eventName)).length;
          const button = document.createElement("button");
          button.type = "button";
          button.className = "dashboard-event";
          button.setAttribute("aria-pressed", String(selectedEvent === eventName));
          const name = document.createElement("strong");
          name.textContent = eventName;
          const tally = document.createElement("span");
          tally.textContent = `${count} ${count === 1 ? "participant" : "participants"}`;
          button.append(name, tally);
          button.addEventListener("click", () => {
            selectedEvent = eventName;
            renderEventLists();
            renderParticipants();
          });
          list.appendChild(button);
        });
      });
    };
    const downloadCsv = () => {
      if (!selectedEvent) return;
      const rows = [["No.", "Name", "Student ID", "Course", "Year", "Gender", "Event"]];
      selectedParticipants().forEach((student, index) => rows.push([
        String(index + 1), student.name, student.usn,
        student.courseLabel, student.year, student.gender, selectedEvent
      ]));
      const csv = rows.map((row) => row.map(safeCell).join(",")).join("\r\n");
      const blobUrl = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      const groupName = selectedGroup.replace(/-/g, "_");
      const eventName = selectedEvent.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      link.href = blobUrl;
      link.download = `sports_day_2026_${groupName}_${eventName}.csv`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    };
    const loadDashboard = async () => {
      try {
        client = window.getSupabaseClient();
        const { data: sessionData, error: sessionError } = await client.auth.getSession();
        if (sessionError) throw sessionError;
        if (!sessionData.session) {
          window.location.replace("organizer-login.html");
          return;
        }
        const { data: isAdmin, error: accessError } = await client.rpc("is_sports_day_admin");
        if (accessError || isAdmin !== true) {
          await client.auth.signOut();
          window.location.replace("organizer-login.html");
          return;
        }
        document.getElementById("organiser-email-label").textContent = sessionData.session.user.email || "Signed in organiser";
        const { data, error } = await client.from("students")
          .select("student_name, usn, course, study_year, gender, created_at, student_events(event_name)")
          .order("created_at", { ascending: false });
        if (error) throw error;
        students = (data || []).map((record) => ({
          name: record.student_name,
          usn: record.usn,
          course: record.course,
          courseLabel: ({ BCom: "B.Com", BSALP: "B.ASLP" })[record.course] || record.course,
          year: record.study_year,
          gender: record.gender,
          events: (record.student_events || []).map((item) => item.event_name)
        }));
        updateGroupCounts();
        renderEventLists();
        dashboardStatus.textContent = `Registration records loaded · ${students.length} ${students.length === 1 ? "student" : "students"}.`;
        dashboardStatus.classList.remove("error");
      } catch (error) {
        errorStatus(error.message || "The registration database could not be loaded.");
      }
    };

    document.querySelectorAll("[data-group]").forEach((button) => button.addEventListener("click", () => {
      selectedGroup = button.dataset.group;
      selectedEvent = "";
      updateGroupCounts();
      renderEventLists();
      renderParticipants();
    }));
    document.getElementById("participant-search").addEventListener("input", renderParticipants);
    document.getElementById("download-event-csv").addEventListener("click", downloadCsv);
    document.getElementById("organiser-logout").addEventListener("click", async () => {
      try { await client?.auth.signOut(); } finally { window.location.href = "organizer-login.html"; }
    });
    loadDashboard();
  }

  // Local archive preview dialog.
  const galleryDialog = document.getElementById("gallery-dialog");
  if (galleryDialog) {
    const image = document.getElementById("gallery-dialog-image");
    const caption = document.getElementById("gallery-dialog-caption");
    document.querySelectorAll("[data-gallery-image]").forEach((button) => {
      button.addEventListener("click", () => {
        image.src = button.dataset.galleryImage;
        image.alt = button.querySelector("img").alt;
        caption.textContent = button.dataset.galleryTitle;
        galleryDialog.showModal();
      });
    });
    galleryDialog.querySelector("[data-dialog-close]").addEventListener("click", () => galleryDialog.close());
    galleryDialog.addEventListener("click", (event) => {
      if (event.target === galleryDialog) galleryDialog.close();
    });
  }
})();
