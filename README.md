# Windows Link Router

> NOTE: I'm just fleshing out this idea for now. Requirements below. Feel free to [discuss](https://github.com/karmaniverous/win-link-router/discussions!

---

## 1. Scope & Goals

The application is a Windows desktop app that:

* Registers itself as a handler for one or more URI schemes (e.g. `tel:`).
* Receives those URIs from the OS and **forwards** them to other apps or URLs based on user‑defined rules.
* Lets the user manage a **mapping**:

> `link type / protocol` → ordered list of **target URL templates**

with support for **presets** for common link types (e.g. TEL → WhatsApp).

---

## 2. Actors

* **End user**

  * Installs the app
  * Configures mappings
  * Selects the app as default handler for specific link types in Windows
* **Operating system (Windows)**

  * Invokes the app when a registered protocol is clicked (e.g. `tel:` link in a browser)
  * Manages default app selection UI (Default Apps → link types)

---

## 3. Core Concepts

* **Link type / protocol**

  * A URI scheme like `TEL`, `MAILTO`, `CALLTO`, etc.
  * Internally stored as an uppercase string, without a trailing colon.

* **Payload**

  * A value derived from the incoming URI, used to fill templates.
  * Example: for `tel:+1 (555) 123-4567`, payload might be `+15551234567`.

* **Template**

  * A string that describes a forwarding target, e.g.

    * `whatsapp://send?phone={{payload}}`
    * `https://wa.me/{{payload}}`
  * Includes at least the placeholder `{{payload}}` which is replaced at runtime.

* **Preset**

  * A built‑in default configuration for a specific link type (e.g. TEL), consisting of one or more templates.
  * Used as initial values when user first adds / enables that link type; user can modify afterwards.

---

## 4. Functional Requirements

### 4.1 Application startup and lifecycle

1. **Normal launch (no URI argument)**

   * When started from Start Menu / shortcut, the app **opens the main window** showing:

     * List of configured link types
     * Details of templates for the selected link type
     * Controls to add/remove/edit mappings.

2. **Protocol launch (with URI argument)**

   * When the app is launched by Windows with a URI argument (e.g. `tel:+15551234567`):

     * The app must **parse the command-line arguments** and extract the URI.
     * It must **process routing** based on the configuration (see 4.5).
     * It may optionally bring the main window to front (configurable), but routing must work even if the window stays hidden.

3. **Single instance**

   * The app must run as a **single instance**:

     * If a second instance is started with a URI argument, it passes that URI to the already running instance.
     * The existing instance performs the routing for that URI.

---

### 4.2 Link type / protocol registration awareness

4. **Display registered link types (from app’s own registration)**

   * The app must be able to show the list of link types it is **registered for** (i.e. those configured in its own registry Capabilities).
   * For each such link type, the app must display:

     * The protocol name (e.g. `TEL`)
     * Whether it is **enabled in the router config** (i.e. has a SchemeConfig entry).

5. **Indicate default handler status (read‑only)**

   * For each registered link type, the app must indicate whether it is **currently the default handler** in Windows, based on reading the appropriate registry entries.
   * The app **must not** attempt to directly modify Windows’ default handler setting; it can only show the status.

6. **Shortcut to OS default app settings**

   * For each link type, the app must offer a way (e.g. “Set as default…” button) to:

     * Open the relevant Windows “Default Apps” UI, so the user can set this app as the default handler for that link type.

---

### 4.3 Configuration management

7. **Per-user configuration storage**

   * The app must store configuration per user (e.g. in `%APPDATA%`), not machine-wide.
   * Configuration must include:

     * All link types user has configured
     * For each link type, its template list and ordering.

8. **Initial configuration**

   * On first launch without existing config:

     * The app must create a default config.
     * Default config should include built‑in presets (e.g. TEL preset) as disabled or enabled according to design (your choice, but defined).

9. **Link type CRUD**

   * The user must be able to:

     * **Add** a new link type (entering the protocol name, e.g. `TEL` or `mailto`).
     * **Edit** a link type’s name (subject to constraints; must be valid scheme characters).
     * **Remove** a link type and its associated templates from the configuration.
   * The app must prevent duplicates (no two entries for the same protocol name).

10. **Template management per link type**

    * For each link type, the user must be able to:

      * **Add** a template (label + template string).
      * **Edit** a template’s label and template string.
      * **Enable/disable** each template.
      * **Reorder** templates to define fallback order.
      * **Remove** templates.

11. **Validation**

    * When the user edits templates, the app must:

      * Validate that the template string is non-empty.
      * Validate that the template string contains the `{{payload}}` placeholder (or warn the user if it doesn’t, depending on your final rule).
      * Prevent saving invalid templates, or clearly indicate that they are invalid.

12. **Autosave**

    * Changes made in the GUI (adding/editing/removing link types or templates) must be persisted without requiring the user to explicitly “save”.

---

### 4.4 Presets

13. **Preset availability**

    * The app must ship with a set of **built‑in presets** for selected link types (at minimum, TEL with the WhatsApp routing you described).

14. **Preset application on add**

    * When the user adds a link type that has a built‑in preset:

      * The app must offer to initialize that link type with the preset templates.
      * This can be automatic (pre-populate the new link type) or via a user prompt (e.g. “Use preset for TEL?”).

15. **Preset visibility**

    * In the UI for a link type that has an associated preset, the app must:

      * Indicate that the current configuration is based on a preset (at least initially),
      * Provide an option to **reset to preset**, discarding user changes for that link type.

16. **User modification of preset**

    * After applying a preset, the user must be able to:

      * Change labels, templates, enabled flags, and order.
      * Add new templates beyond the preset ones.
      * Remove preset templates individually.

17. **Preset reset behavior**

    * When the user chooses “reset to preset”:

      * The app must replace the current templates for that link type with the preset template list.
      * Local edits to labels/template strings/order must be discarded for that link type.
      * The user should be asked to confirm destructive reset (to avoid accidental data loss).

---

### 4.5 Routing behavior (when invoked via URI)

18. **URI capture**

    * When the app receives a URI argument (from OS or second instance), it must:

      * Identify the scheme (link type) from the URI (e.g. `tel` from `tel:+1555`).
      * Normalize the scheme to a canonical form (e.g. uppercased).

19. **Payload extraction**

    * For each known link type, the app must define a **payload extraction rule**:

      * For TEL:

        * Strip the `tel:` prefix (case-insensitive).
        * Remove all characters except digits and a leading `+`.
      * For other schemes (at minimum):

        * Provide a generic fallback (e.g. everything after the first `:`).
    * If payload extraction fails or yields an empty string:

      * The app must not attempt to launch targets.
      * It must either fail silently or log/display an error (see 4.7).

20. **Template resolution**

    * After obtaining the payload for a link type:

      * The app must look up that link type’s configuration.
      * It must build a list of **enabled templates** in the configured order.
      * For each template, it must substitute `{{payload}}` with the extracted payload to get a target URL.

21. **Forwarding to target**

    * The app must attempt to open the first enabled, successfully rendered template:

      * Use the appropriate Electron API to open the target URL via the OS (e.g. `shell.openExternal`).
    * If opening the first target fails (e.g. because the protocol is not registered), the app must:

      * Optionally try the next enabled template in order (if configured to allow fallbacks).
      * Stop when one succeeds or the list is exhausted.

22. **No configured templates**

    * If a URI is received for a link type that:

      * Exists in the config but has no enabled templates, **or**
      * Does not exist in the config at all,
        the app must:
      * Not attempt to open any external target.
      * Provide a user-visible warning (e.g. notification, log entry, or UI banner) explaining that no routing is configured for that link type.

---

### 4.6 User interface behavior

23. **Main view**

    * The main window must provide:

      * A list of link types known to the app.
      * Ability to select a link type and view its templates.
      * Indicators for:

        * Whether the app is **registered** for that link type.
        * Whether the app is the **current default** handler for that link type (if determinable).

24. **Template editor**

    * For the selected link type, the UI must include:

      * A table or list of templates with:

        * Label
        * Template string
        * Enabled/disabled indicator
        * Move up/down controls
      * Controls to add, remove, and edit templates.

25. **Preset controls**

    * For link types with known presets, the UI must:

      * Show that a preset exists (e.g. “TEL preset available”).
      * Provide a control to:

        * Initialize from preset (if not already configured).
        * Reset to preset (if user has modified it).

26. **Protocol status + OS integration**

    * For each link type entry, the UI must:

      * Show a status icon or text indicating “Default” vs “Not default”.
      * Provide a button or link that opens Windows’ default apps settings page relevant to protocol selection.

27. **Minimal UX when launched via URI**

    * When the app is only started to route a URI:

      * It must perform the routing quickly and not block the user with prompts by default.
      * UI opening/focus on such launches should be configurable (e.g. an option “Minimize when routing links” vs “Always show main window”).

---

### 4.7 Error handling & feedback

28. **Invalid URI handling**

    * If the incoming argument is not a valid URI or its scheme cannot be determined:

      * The app must not crash.
      * It must log the incident and optionally show a non-intrusive error.

29. **Template errors**

    * If a specific template fails to open (e.g. because its protocol is unregistered):

      * The app may attempt the next template in the fallback list.
      * It must log which template failed and why, if detectable.

30. **Configuration load/save errors**

    * If the app fails to load configuration (e.g. malformed JSON):

      * It must fall back to a safe default (e.g. recreate config using presets).
      * It must notify the user that configuration was reset.

---

### 4.8 Logging (minimal requirement)

31. **Routing log (minimal)**

    * The app must maintain at least a simple log (in memory or file) with:

      * Timestamp
      * Incoming URI
      * Resolved link type
      * Resolved payload
      * Target URL(s) attempted
      * Result (success/failure)

This is mainly to debug routing issues; a full log viewer in the UI is optional but convenient.

---

Built for you with ❤️ on Bali! Find more great tools & templates on [my GitHub Profile](https://github.com/karmaniverous).
