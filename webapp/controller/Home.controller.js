sap.ui.define([
    "sap/ui/core/mvc/Controller"
], (Controller) => {
    "use strict";

    return Controller.extend("com.globant.aichat.aichatpdfui5.controller.Home", {
        onInit() {
            // Hide success message after 3 seconds
            setTimeout(() => {
                const oSuccessMessage = this.byId("successMessage");
                if (oSuccessMessage) {
                    oSuccessMessage.setVisible(false);
                }
            }, 3000);
        },

        onAskQuestion() {
            // TODO: Implement chat functionality
        },

        onAnalyzePDF() {
            // TODO: Implement PDF analysis functionality
        }
    });
});
