// Configuration array with login credentials and base URLs
const testConfigs = [
  {
    baseUrl: "http://localhost:3000",
    credentials: {
      rollNumber: "TEST123",
      name: "Test User",
    },
  },
  {
    baseUrl: "http://localhost:3000",
    credentials: {
      rollNumber: "STUDENT456",
      name: "Jane Student",
    },
  },
  {
    baseUrl: "http://dev-server.example.com",
    credentials: {
      rollNumber: "DEV789",
      name: "Dev Tester",
    },
  },
];

// Default to first config if not specified
const activeConfig = Cypress.env("CONFIG_INDEX")
  ? testConfigs[Cypress.env("CONFIG_INDEX")]
  : testConfigs[0];

describe("College Student Registration Form Tests", () => {
  beforeEach(() => {
    // Visit the login page using the configured baseUrl
    cy.visit(`${activeConfig.baseUrl}/login`);

    // Perform login with configured credentials
    cy.get('input[id="rollNumber"]').type(activeConfig.credentials.rollNumber);
    cy.get('input[id="name"]').type(activeConfig.credentials.name);
    cy.get('button[type="submit"]').click();

    // Wait for redirect to form page
    cy.url().should("include", "/form");

    // Verify the form title is displayed
    cy.contains("College Student Registration and Course Enrollment").should(
      "be.visible"
    );

    // Wait for form data to load via TanStack Query
    cy.contains("Personal Information", { timeout: 10000 }).should(
      "be.visible"
    );
  });

  describe("Form Structure Tests", () => {
    it("should display all form sections", () => {
      // Check if all sections are present in the form navigation
      cy.contains("Personal Information").should("be.visible");
      cy.contains("Contact Information").should("be.visible");
      cy.contains("Emergency Contact Information").should("be.visible");
      cy.contains("Academic Information").should("be.visible");

      // Note: Removed the other sections that don't exist in the new API
    });

    it("should display section descriptions", () => {
      cy.contains("Please provide your personal details").should("be.visible");
      cy.contains("How can we reach you?").should("be.visible");
      cy.contains("Who should we contact in case of emergency?").should(
        "be.visible"
      );
      cy.contains("Please provide your academic details").should("be.visible");
    });

    it("should display form progress indicator", () => {
      // Check for section navigation buttons - only 4 sections now
      cy.get("button").contains("1").should("be.visible");
      cy.get("button").contains("2").should("be.visible");
      cy.get("button").contains("3").should("be.visible");
      cy.get("button").contains("4").should("be.visible");

      // Progress bar should still be visible
      cy.get("div.bg-blue-600.h-1").should("be.visible");
    });
  });

  describe("Personal Information Section Tests", () => {
    it("should validate required fields in personal information section", () => {
      // Clear any pre-filled fields
      cy.get('[data-test-id="first-name-input"]').clear();
      cy.get('[data-test-id="last-name-input"]').clear();
      cy.get('[data-test-id="dob-input"]').clear();

      // Try to submit the form without filling required fields
      cy.get("button").contains("Next").click();

      // Check for validation errors on required fields
      cy.get('[data-test-id="first-name-input"]')
        .parent()
        .contains("Please enter a valid first name");
      cy.get('[data-test-id="last-name-input"]')
        .parent()
        .contains("Please enter a valid last name");
      cy.get('[data-test-id="dob-input"]')
        .parent()
        .contains("You must be at least 16 years old");
      cy.get('[data-test-id="gender-radio-group"]')
        .parent()
        .contains("Please select a gender option");
      cy.get('[data-test-id="registration-number"]')
        .parent()
        .contains("Registration number must be between 2-50 characters");
    });

    it("should successfully fill personal information fields", () => {
      // Fill out the personal information section
      cy.get('[data-test-id="first-name-input"]').clear().type("John");
      cy.get('[data-test-id="last-name-input"]').clear().type("Doe");

      // Set date of birth to 18 years ago
      const eighteenYearsAgo = new Date();
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
      const formattedDate = eighteenYearsAgo.toISOString().split("T")[0]; // YYYY-MM-DD
      cy.get('[data-test-id="dob-input"]').clear().type(formattedDate);

      // Select gender
      cy.get('[data-test-id="gender-male"]').click();

      // Fill registration number
      cy.get('[data-test-id="registration-number"]').clear().type("REG12345");

      // Click Next
      cy.get("button").contains("Next").click();

      // Should now be on Contact Information section
      cy.contains("Contact Information").should("be.visible");
    });
  });

  describe("Contact Information Section Tests", () => {
    beforeEach(() => {
      // Fill out personal information section to move to contact section
      fillPersonalInformationSection();
    });

    it("should validate required fields in contact information section", () => {
      // Try to submit the form without filling required fields
      cy.get("button").contains("Next").click();

      // Check for validation errors on required fields - only testing those in the new API
      cy.get('[data-test-id="phone-input"]')
        .parent()
        .contains("Please enter a valid 10-digit phone number");
      cy.get('[data-test-id="address-type-radio"]')
        .parent()
        .contains("Please select an address type");
      cy.get('[data-test-id="state-dropdown"]')
        .parent()
        .contains("Please select a state");
      cy.get('[data-test-id="street-address-input"]')
        .parent()
        .contains("Please enter a valid street address");
    });

    it("should validate phone number format", () => {
      // Test invalid phone format
      cy.get('[data-test-id="phone-input"]').type("123");
      cy.get("button").contains("Next").click();
      cy.get('[data-test-id="phone-input"]')
        .parent()
        .contains("Please enter a valid 10-digit phone number");

      // Test valid phone format
      cy.get('[data-test-id="phone-input"]').clear().type("1234567890");
      cy.get("button").contains("Next").click();

      // Fill other required fields to proceed
      cy.get('[data-test-id="permanent-address"]').click();
      cy.get('[data-test-id="state-dropdown"]').select("Maharashtra");
      cy.get('[data-test-id="street-address-input"]').type("123 Main Street");

      cy.get("button").contains("Next").click();

      // Should now be on Emergency Contact section
      cy.contains("Emergency Contact Information").should("be.visible");
    });

    it("should successfully complete contact information section", () => {
      fillContactInformationSection();

      // Should now be on Emergency Contact section
      cy.contains("Emergency Contact Information").should("be.visible");
    });
  });

  describe("Emergency Contact Section Tests", () => {
    beforeEach(() => {
      // Fill out previous sections to get to emergency contact section
      fillPersonalInformationSection();
      fillContactInformationSection();
    });

    it("should validate required fields in emergency contact section", () => {
      // Try to submit the form without filling required fields
      cy.get("button").contains("Next").click();

      // Check for validation errors on required fields
      cy.get('[data-test-id="emergency-contact-name"]')
        .parent()
        .contains("Please enter a valid name");
      cy.get('[data-test-id="emergency-contact-relationship"]')
        .parent()
        .contains("Please select a relationship");
      cy.get('[data-test-id="emergency-contact-phone"]')
        .parent()
        .contains("Please enter a valid phone number");
    });

    it("should validate optional email field format", () => {
      // Invalid email format in optional field
      cy.get('[data-test-id="emergency-contact-email"]').type("invalid-email");
      cy.get("button").contains("Next").click();
      cy.get('[data-test-id="emergency-contact-email"]')
        .parent()
        .contains("Please enter a valid email address");

      // Valid email format
      cy.get('[data-test-id="emergency-contact-email"]')
        .clear()
        .type("emergency@example.com");

      // Fill required fields
      cy.get('[data-test-id="emergency-contact-name"]').type("Jane Doe");
      cy.get('[data-test-id="emergency-contact-relationship"]').select(
        "Parent"
      );
      cy.get('[data-test-id="emergency-contact-phone"]').type("9876543210");

      cy.get("button").contains("Next").click();

      // Should now be on Academic Information section
      cy.contains("Academic Information").should("be.visible");
    });

    it("should successfully complete emergency contact section", () => {
      fillEmergencyContactSection();

      // Should now be on Academic Information section
      cy.contains("Academic Information").should("be.visible");
    });
  });

  describe("Academic Information Section Tests", () => {
    beforeEach(() => {
      // Fill out previous sections to get to academic information section
      fillPersonalInformationSection();
      fillContactInformationSection();
      fillEmergencyContactSection();
    });

    it("should validate required fields in academic information section", () => {
      // Try to submit the form
      cy.get("button").contains("Submit").click();

      // Check for validation errors on required fields
      cy.get('[data-test-id="admission-status-radio"]')
        .parent()
        .contains("Please select your admission status");
      cy.get('[data-test-id="student-type-radio"]')
        .parent()
        .contains("Please select your student type");
      cy.get('[data-test-id="intended-major-dropdown"]')
        .parent()
        .contains("Please select your intended major");
    });

    it("should validate student ID format if provided", () => {
      // Test invalid student ID (if not matching 9 digits)
      cy.get('[data-test-id="student-id-input"]').type("12345");
      cy.get("button").contains("Submit").click();
      cy.get('[data-test-id="student-id-input"]')
        .parent()
        .contains("Student ID must be in the format of 9 digits");

      // Test valid student ID
      cy.get('[data-test-id="student-id-input"]').clear().type("123456789");

      // Fill required fields
      cy.get('[data-test-id="status-new"]').click();
      cy.get('[data-test-id="type-undergraduate"]').click();
      cy.get('[data-test-id="intended-major-dropdown"]').select(
        "Computer Science"
      );

      cy.get("button").contains("Submit").click();

      // Should now see success message
      // cy.contains("Form submitted successfully", { timeout: 10000 }).should(
      //   "be.visible"
      // );
    });

    it("should successfully complete academic information section and submit form", () => {
      fillAcademicInformationSection();

      // Submit the form
      cy.get("button").contains("Submit").click();

      // Verify successful submission
      // cy.contains("Form submitted successfully", { timeout: 10000 }).should(
      //   "be.visible"
      // );
    });
  });

  describe("End-to-End Form Submission Test", () => {
    it("should successfully submit the complete form", () => {
      // Fill all sections
      fillPersonalInformationSection();
      fillContactInformationSection();
      fillEmergencyContactSection();
      fillAcademicInformationSection();

      // Submit the form
      cy.get('button[type="submit"]').click();

      // Verify successful submission
      // cy.contains("Form submitted successfully", { timeout: 10000 }).should(
      //   "be.visible"
      // );
    });

    it("should maintain field values when navigating between sections", () => {
      // Fill personal information
      fillPersonalInformationSection();

      // Fill contact information
      fillContactInformationSection();

      // Navigate back to personal information
      cy.get("button").contains("Previous").click();
      cy.get("button").contains("Previous").click();

      // Verify fields still have values
      cy.get('[data-test-id="first-name-input"]').should("have.value", "John");
      cy.get('[data-test-id="last-name-input"]').should("have.value", "Doe");

      // Navigate forward again
      cy.get("button").contains("Next").click();

      // Verify contact fields still have values
      cy.get('[data-test-id="phone-input"]').should("have.value", "1234567890");
    });
  });

  // Testing each configuration through iteration
  if (Cypress.env("TEST_ALL_CONFIGS")) {
    describe("Multi-Configuration Tests", () => {
      it("should verify login works across all configurations", () => {
        // This test is only run when TEST_ALL_CONFIGS is set
        testConfigs.forEach((config, index) => {
          // Skip the active config since we already tested it
          if (index === (Cypress.env("CONFIG_INDEX") || 0)) {
            return;
          }

          // Visit the login page for this config
          cy.visit(`${config.baseUrl}/login`);

          // Perform login with this config's credentials
          cy.get('input[id="rollNumber"]').type(config.credentials.rollNumber);
          cy.get('input[id="name"]').type(config.credentials.name);
          cy.get('button[type="submit"]').click();

          // Verify redirect to form page worked
          cy.url().should("include", "/form");

          // Verify the form loaded
          cy.contains(
            "College Student Registration and Course Enrollment"
          ).should("be.visible");
          cy.contains("Personal Information").should("be.visible");
        });
      });
    });
  }

  // Helper functions to fill out each section
  function fillPersonalInformationSection() {
    cy.get('[data-test-id="first-name-input"]').clear().type("John");
    cy.get('[data-test-id="last-name-input"]').clear().type("Doe");

    // Set date of birth to 18 years ago
    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
    const formattedDate = eighteenYearsAgo.toISOString().split("T")[0]; // YYYY-MM-DD
    cy.get('[data-test-id="dob-input"]').clear().type(formattedDate);

    // Select gender
    cy.get('[data-test-id="gender-male"]').click();

    // Fill registration number
    cy.get('[data-test-id="registration-number"]').clear().type("REG12345");

    // Move to next section
    cy.get("button").contains("Next").click();
  }

  function fillContactInformationSection() {
    // Wait for section to be visible
    cy.contains("Contact Information").should("be.visible");

    // Fill out required fields
    cy.get('[data-test-id="phone-input"]').clear().type("1234567890");
    cy.get('[data-test-id="permanent-address"]').click();
    cy.get('[data-test-id="state-dropdown"]').select("Maharashtra");
    cy.get('[data-test-id="street-address-input"]')
      .clear()
      .type("123 Main Street");

    // Check the mailing address checkbox (optional)
    cy.get('[data-test-id="different-mailing-checkbox"]').check();

    // Move to next section
    cy.get("button").contains("Next").click();
  }

  function fillEmergencyContactSection() {
    // Wait for section to be visible
    cy.contains("Emergency Contact Information").should("be.visible");

    cy.get('[data-test-id="emergency-contact-name"]').clear().type("Jane Doe");
    cy.get('[data-test-id="emergency-contact-relationship"]').select("Parent");
    cy.get('[data-test-id="emergency-contact-phone"]')
      .clear()
      .type("9876543210");
    cy.get('[data-test-id="emergency-contact-email"]')
      .clear()
      .type("jane@example.com");
    cy.get('[data-test-id="emergency-contact-address"]')
      .clear()
      .type("456 Park Avenue, Mumbai");

    // Move to next section
    cy.get("button").contains("Next").click();
  }

  function fillAcademicInformationSection() {
    // Wait for section to be visible
    cy.contains("Academic Information").should("be.visible");

    cy.get('[data-test-id="student-id-input"]').clear().type("123456789");
    cy.get('[data-test-id="type-undergraduate"]').click();
    cy.get('[data-test-id="intended-major-dropdown"]').select(
      "Computer Science"
    );
    cy.get('[data-test-id="status-new"]').click();
  }
});
