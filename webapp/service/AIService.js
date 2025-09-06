sap.ui.define([
    "sap/ui/base/Object",
    "sap/m/MessageToast"
], function (BaseObject, MessageToast) {
    "use strict";

    return BaseObject.extend("com.globant.aichat.aichatpdfui5.service.AIService", {

        constructor: function (oModel) {
            this._oModel = oModel;
        },

        /**
         * Calls the askQuestion function import
         * @param {string} sQuestion - The question to ask
         * @param {string} sSelectedModel - The selected model ID
         * @returns {Promise} Promise that resolves with the response
         */
        askQuestion: function (sQuestion, sSelectedModel) {
            return new Promise((resolve, reject) => {
                if (!this._oModel) {
                    reject(new Error("OData model not available"));
                    return;
                }

                const mParameters = {
                    question: sQuestion,
                    selectedModel: sSelectedModel
                };

                this._oModel.callFunction("/askQuestion", {
                    method: "POST",
                    urlParameters: mParameters,
                    success: function (oData) {
                        resolve(oData);
                    },
                    error: function (oError) {
                        console.error("Error calling askQuestion:", oError);
                        let sErrorMessage = "Error al procesar la pregunta";
                        
                        if (oError.responseText) {
                            try {
                                const oErrorData = JSON.parse(oError.responseText);
                                if (oErrorData.error && oErrorData.error.message) {
                                    sErrorMessage = oErrorData.error.message.value || oErrorData.error.message;
                                }
                            } catch (e) {
                                // Use default error message
                            }
                        }
                        
                        reject(new Error(sErrorMessage));
                    }
                });
            });
        },

        /**
         * Calls the askAboutPDF function import
         * @param {string} sQuestion - The question about the PDF
         * @param {string} sFileName - The PDF file name
         * @param {string} sSelectedModel - The selected model ID
         * @returns {Promise} Promise that resolves with the response
         */
        askAboutPDF: function (sQuestion, sFileName, sSelectedModel) {
            return new Promise((resolve, reject) => {
                if (!this._oModel) {
                    reject(new Error("OData model not available"));
                    return;
                }

                const mParameters = {
                    question: sQuestion,
                    fileName: sFileName,
                    selectedModel: sSelectedModel
                };

                this._oModel.callFunction("/askAboutPDF", {
                    method: "POST",
                    urlParameters: mParameters,
                    success: function (oData) {
                        resolve(oData);
                    },
                    error: function (oError) {
                        console.error("Error calling askAboutPDF:", oError);
                        let sErrorMessage = "Error al procesar la pregunta sobre el PDF";
                        
                        if (oError.responseText) {
                            try {
                                const oErrorData = JSON.parse(oError.responseText);
                                if (oErrorData.error && oErrorData.error.message) {
                                    sErrorMessage = oErrorData.error.message.value || oErrorData.error.message;
                                }
                            } catch (e) {
                                // Use default error message
                            }
                        }
                        
                        reject(new Error(sErrorMessage));
                    }
                });
            });
        }
    });
});
