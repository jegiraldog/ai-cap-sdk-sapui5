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
         * Asks a question about a PDF file using direct OData V2 call
         * Follows best practices with simplified approach
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

                // Validaciones siguiendo mejores prácticas
                if (!sQuestion || !sFileName) {
                    reject(new Error("Pregunta y archivo PDF son obligatorios"));
                    return;
                }

                const mParameters = {
                    question: sQuestion,           // String(1000)
                    fileName: sFileName,           // String(255)
                    selectedModel: sSelectedModel  // String(255) - puede ser null/undefined
                };

                // Llamada OData V2 directa siguiendo el patrón del ejemplo
                this._oModel.callFunction("/askAboutPDF", {
                    method: "POST",
                    urlParameters: mParameters,
                    success: function (oData, response) {
                        // oData contiene la respuesta directa del servicio
                        resolve(oData);
                    },
                    error: function (oError) {
                        console.error("Error calling askAboutPDF:", oError);
                        
                        // Manejo de errores mejorado siguiendo mejores prácticas
                        let sErrorMessage = `Error al consultar PDF: ${oError.message || 'Error desconocido'}`;
                        
                        if (oError.responseText) {
                            try {
                                const oErrorData = JSON.parse(oError.responseText);
                                if (oErrorData.error && oErrorData.error.message) {
                                    sErrorMessage = oErrorData.error.message.value || oErrorData.error.message;
                                }
                            } catch (e) {
                                // Usar mensaje de error por defecto
                            }
                        }
                        
                        reject(new Error(sErrorMessage));
                    }
                });
            });
        },

        /**
         * Uploads a PDF file with content using XMLHttpRequest
         * @param {File} oFile - The PDF file to upload
         * @returns {Promise} Promise that resolves with upload response
         */
        _uploadPDFWithContent: function (oFile) {
            return new Promise((resolve, reject) => {
                const formData = new FormData();
                formData.append('file', oFile);
                formData.append('fileName', oFile.name);

                const xhr = new XMLHttpRequest();
                xhr.open('POST', '/odata/v2/ai/uploadPDF', true);
                
                xhr.onload = function() {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            resolve(response.d || response || { success: true, fileName: oFile.name });
                        } catch (e) {
                            // If response is not JSON, assume success
                            resolve({ success: true, fileName: oFile.name });
                        }
                    } else {
                        reject(new Error(`Error al subir el archivo: ${xhr.status} ${xhr.statusText}`));
                    }
                };
                
                xhr.onerror = function() {
                    reject(new Error('Error de red al subir el archivo'));
                };
                
                xhr.send(formData);
            });
        },

        /**
         * Uploads a PDF file to the server using OData function import
         * @param {File} oFile - The PDF file to upload
         * @returns {Promise} Promise that resolves with upload response
         */
        _uploadPDF: function (oFile) {
            return new Promise((resolve, reject) => {
                // The uploadPDF function import doesn't take parameters according to metadata
                // It might expect the file to be sent in the request body or as a different mechanism
                // Let's try calling it as a simple function import first
                this._oModel.callFunction("/uploadPDF", {
                    method: "POST",
                    success: function (oData) {
                        resolve(oData.uploadPDF || oData);
                    },
                    error: function (oError) {
                        console.error("Error calling uploadPDF:", oError);
                        let sErrorMessage = "Error al subir el archivo PDF";
                        
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
         * Processes an uploaded PDF file
         * @param {string} sFileName - The name of the uploaded PDF file
         * @returns {Promise} Promise that resolves with process response
         */
        _processPDF: function (sFileName) {
            return new Promise((resolve, reject) => {
                const mParameters = {
                    fileName: sFileName
                };

                this._oModel.callFunction("/processPDF", {
                    method: "POST",
                    urlParameters: mParameters,
                    success: function (oData) {
                        resolve(oData.processPDF || oData);
                    },
                    error: function (oError) {
                        console.error("Error calling processPDF:", oError);
                        let sErrorMessage = "Error al procesar el archivo PDF";
                        
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
         * Converts a file to base64 string
         * @param {File} oFile - The file to convert
         * @returns {Promise} Promise that resolves with base64 string
         */
        _fileToBase64: function (oFile) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = function() {
                    // Remove the data:application/pdf;base64, prefix
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = function(error) {
                    reject(error);
                };
                reader.readAsDataURL(oFile);
            });
        }
    });
});
