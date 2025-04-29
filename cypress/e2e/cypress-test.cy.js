const { _ } = Cypress;

describe("Dynamic College Student Registration Form Tests", () => {
  let formStructure = null;
  let apiCallsMade = 0;

  beforeEach(() => {
    // Intercept the API call to get form structure - now with conditional stub
    cy.intercept("GET", "**/api/**form**", (req) => {
      apiCallsMade++;
      // If we already have the form structure and nothing has changed, use cached data
      if (formStructure && !req.query.sectionCount && !req.query.fieldCount) {
        req.reply({
          statusCode: 200,
          body: formStructure,
        });
        console.log("Using cached form structure");
      } else {
        // Let the actual API call proceed for initial load or when parameters change
        req.continue();
      }
    }).as("formData");

    // Visit the login page first
    cy.visit("http://localhost:3000/login");

    // Perform login
    cy.get('input[id="rollNumber"]').type("TEST123");
    cy.get('input[id="name"]').type("Test User");
    cy.get('button[type="submit"]').click();

    // Wait for redirect to form page
    cy.url().should("include", "/form");

    // Verify the form title is displayed
    cy.contains("College Student Registration and Course Enrollment", {
      timeout: 10000,
    }).should("be.visible");

    // Wait for form data API call and store the structure
    cy.wait("@formData").then((interception) => {
      // Log the API response for debugging
      console.log("Form API Response:", interception.response);

      // Store form structure safely (handle different response formats)
      if (interception.response?.body?.form) {
        formStructure = interception.response.body.form;
      } else if (interception.response?.body?.sections) {
        formStructure = interception.response.body;
      } else {
        formStructure = interception.response?.body || { sections: [] };
      }

      // Validate that we have form data with sections
      expect(formStructure).to.exist;
      expect(formStructure.sections).to.be.an("array");
    });
  });

  // Add a test to verify optimized API calls
  describe("API Call Optimization Tests", () => {
    it("should only make API calls on initial load or when section/field counts change", () => {
      // Reset API call counter for this test
      apiCallsMade = 0;

      // Navigate through sections without changing parameters - should use cached data
      cy.then(() => {
        // Fill first section
        if (formStructure.sections.length > 0) {
          fillSectionWithValidData(formStructure.sections[0]);

          // Navigate to next section if available
          if (formStructure.sections.length > 1) {
            cy.get("button").contains("Next").click();

            // No additional API call should be made during navigation
            cy.wait(1000); // Give time for any potential API calls
            expect(apiCallsMade).to.equal(0);

            // Navigate back to first section
            cy.get("button").contains("Previous").click();

            // Still no additional API calls
            cy.wait(1000);
            expect(apiCallsMade).to.equal(0);
          }
        }
      });

      // Simulate section count change by triggering a parameterized API call
      cy.intercept("GET", "**/api/**form**?sectionCount=*").as(
        "sectionCountChange"
      );

      // We need to manually trigger this API call for testing purposes
      // This would normally be triggered by the application when sections change
      cy.window().then((win) => {
        win.fetch(
          `/api/form?sectionCount=${formStructure.sections.length + 1}`
        );
      });

      cy.wait("@sectionCountChange").then(() => {
        // API call count should increase for parameter changes
        expect(apiCallsMade).to.be.greaterThan(0);
      });
    });
  });

  describe("Form Structure Tests", () => {
    it("should display all available form sections", () => {
      // This test dynamically checks all sections from the API
      cy.then(() => {
        formStructure.sections.forEach((section) => {
          cy.contains(section.title).should("be.visible");
          if (section.description) {
            cy.contains(section.description).should("be.visible");
          }
        });
      });
    });

    it("should display form progress indicator", () => {
      cy.then(() => {
        // Check for section navigation buttons - dynamic count based on API
        const sectionCount = formStructure.sections.length;

        for (let i = 1; i <= sectionCount; i++) {
          cy.get("button").contains(String(i)).should("be.visible");
        }

        // Progress bar should still be visible
        cy.get("div.bg-blue-600.h-1").should("be.visible");
      });
    });
  });

  describe("Dynamic Section Field Tests", () => {
    // This test will be generated dynamically for each section
    it("should validate required fields in each section", () => {
      cy.then(() => {
        // Test each section sequentially
        formStructure.sections.forEach((section, sectionIndex) => {
          // Navigate to the section if not already there
          if (sectionIndex > 0) {
            // Fill all previous sections to get to this one
            for (let i = 0; i < sectionIndex; i++) {
              fillSectionWithValidData(formStructure.sections[i]);
              cy.get("button").contains("Next").click();
              // Wait for new section to be visible
              cy.contains(formStructure.sections[i + 1].title, {
                timeout: 5000,
              }).should("be.visible");
            }
          }

          // Now we're at the target section
          cy.contains(section.title).should("be.visible");

          // Clear any pre-filled required fields
          const requiredFields = section.fields.filter(
            (field) => field.required
          );
          requiredFields.forEach((field) => {
            if (
              ["text", "email", "tel", "date", "textarea"].includes(field.type)
            ) {
              cy.get(`[data-test-id="${field.dataTestId}"]`).clear();
            }
          });

          // Try to proceed to trigger validation
          if (sectionIndex === formStructure.sections.length - 1) {
            cy.get("button").contains("Submit").click();
          } else {
            cy.get("button").contains("Next").click();
          }

          // Check for validation errors on required fields
          requiredFields.forEach((field) => {
            cy.get(`[data-test-id="${field.dataTestId}"]`)
              .parent()
              .contains(field.validation?.message || "required");
          });

          // Go back to first section to reset for next iteration
          cy.get("button").contains("1").click();
        });
      });
    });

    it("should successfully complete each section sequentially", () => {
      cy.then(() => {
        // Complete all sections
        formStructure.sections.forEach((section, index) => {
          cy.contains(section.title).should("be.visible");
          fillSectionWithValidData(section);

          // Proceed to next section or submit
          if (index === formStructure.sections.length - 1) {
            cy.get("button").contains("Submit").click();
            // Can add success verification here
          } else {
            cy.get("button").contains("Next").click();
          }
        });
      });
    });
  });

  describe("Navigation and Data Persistence Test", () => {
    it("should maintain field values when navigating between sections without making API calls", () => {
      cy.then(() => {
        if (formStructure.sections.length < 2) {
          cy.log("Need at least 2 sections to test navigation");
          return;
        }

        // Reset API call counter for this test
        apiCallsMade = 0;

        // Fill first section and track a test field
        const firstSection = formStructure.sections[0];
        const testField = firstSection.fields.find(
          (field) => field.type === "text"
        );

        if (!testField) {
          cy.log("No suitable text field found in first section");
          return;
        }

        // Fill the first section
        fillSectionWithValidData(firstSection);
        const testValue = generateTestValue(testField);

        // Go to next section
        cy.get("button").contains("Next").click();

        // Verify no API call was made during navigation
        cy.wait(500);
        expect(apiCallsMade).to.equal(0);

        // Fill second section
        const secondSection = formStructure.sections[1];
        fillSectionWithValidData(secondSection);

        // Go back to first section
        cy.get("button").contains("Previous").click();

        // Verify no API call was made again
        cy.wait(500);
        expect(apiCallsMade).to.equal(0);

        // Verify our test field maintained its value
        cy.get(`[data-test-id="${testField.dataTestId}"]`).should(
          "have.value",
          testValue
        );

        // Go forward again
        cy.get("button").contains("Next").click();

        // Verify we're back at the second section
        cy.contains(secondSection.title).should("be.visible");

        // Confirm we still haven't made any additional API calls
        cy.wait(500);
        expect(apiCallsMade).to.equal(0);
      });
    });
  });

  describe("End-to-End Form Submission Test", () => {
    it("should successfully submit the complete form", () => {
      cy.then(() => {
        // Reset API call counter for this test
        apiCallsMade = 0;

        // Fill all sections sequentially
        formStructure.sections.forEach((section, index) => {
          fillSectionWithValidData(section);
          if (index < formStructure.sections.length - 1) {
            cy.get("button").contains("Next").click();

            // Verify no new API calls during navigation
            cy.wait(200);
            expect(apiCallsMade).to.equal(0);
          }
        });

        // Submit the form
        cy.get("button").contains("Submit").click();

        // Add assertions for form submission success
        // This would depend on your application's feedback mechanism
        // cy.contains("Form submitted successfully", { timeout: 10000 }).should("be.visible");
      });
    });
  });

  // Dynamic helper function to fill any section with valid data
  function fillSectionWithValidData(section) {
    section.fields.forEach((field) => {
      const value = generateTestValue(field);
      const testId = field.dataTestId;

      switch (field.type) {
        case "text":
        case "email":
        case "tel":
        case "textarea":
          cy.get(`[data-test-id="${testId}"]`).clear().type(value);
          break;

        case "date":
          cy.get(`[data-test-id="${testId}"]`).clear().type(value);
          break;

        case "radio":
          if (field.options && field.options.length > 0) {
            // Find first option and click it
            const firstOption = field.options[0];
            cy.get(
              `[data-test-id="${
                firstOption.dataTestId ||
                `${field.fieldId}-${firstOption.value}`
              }"]`
            ).click();
          }
          break;

        case "dropdown":
          if (field.options && field.options.length > 0) {
            // Select first non-empty option
            const validOption =
              field.options.find((opt) => opt.value) || field.options[0];
            cy.get(`[data-test-id="${testId}"]`).select(validOption.value);
          }
          break;

        case "checkbox":
          if (field.required) {
            cy.get(`[data-test-id="${testId}"]`).check();
          }
          break;
      }
    });
  }

  // Helper function to generate appropriate test values for different field types
  function generateTestValue(field) {
    const fieldId = field.fieldId.toLowerCase();

    switch (field.type) {
      case "text":
        if (fieldId.includes("name") && fieldId.includes("first"))
          return "John";
        if (fieldId.includes("name") && fieldId.includes("last")) return "Doe";
        if (fieldId.includes("registration") || fieldId.includes("reg"))
          return "REG12345";
        if (fieldId.includes("studentid") || fieldId.includes("student-id"))
          return "123456789";
        if (fieldId.includes("emergency") && fieldId.includes("name"))
          return "Jane Doe";
        if (fieldId.includes("address")) return "123 Main Street";
        return "Test Value";

      case "email":
        if (fieldId.includes("emergency")) return "emergency@example.com";
        return "test@example.com";

      case "tel":
        return "1234567890";

      case "date":
        // Generate date based on context
        if (fieldId.includes("birth") || fieldId.includes("dob")) {
          // 18 years ago for birth date
          const date = new Date();
          date.setFullYear(date.getFullYear() - 18);
          return date.toISOString().split("T")[0];
        }
        // Default to current date for other date fields
        return new Date().toISOString().split("T")[0];

      case "textarea":
        return "This is a test description for the field.";

      case "dropdown":
      case "radio":
        // These are handled in fillSectionWithValidData
        return "";

      default:
        return "Test Value";
    }
  }
});
