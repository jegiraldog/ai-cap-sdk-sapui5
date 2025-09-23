sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "com/globant/aichat/aichatpdfui5/service/AIService"
], (Controller, MessageToast, MessageBox, JSONModel, AIService) => {
    "use strict";

    return Controller.extend("com.globant.aichat.aichatpdfui5.controller.Home", {
        onInit() {

            // Initialize AI Service
            const oModel = this.getOwnerComponent().getModel();
            this._oAIService = new AIService(oModel);

            // Initialize chat messages model
            const oChatModel = new JSONModel({
                messages: []
            });
            this.getView().setModel(oChatModel, "chat");

            // Initialize UI model for interface state
            const oUIModel = new JSONModel({
                selectedModel: "",
                canSend: false,
                inputLength: 0,
                attachedFile: null,
                hasAttachedFile: false,
                attachedFileName: ""
            });
            this.getView().setModel(oUIModel, "ui");

            // Initialize PDF model for PDF management
            const oPDFModel = new JSONModel({
                pdfs: [],
                selectedPDF: null,
                isUploading: false,
                uploadProgress: 0
            });
            this.getView().setModel(oPDFModel, "pdf");

            // Load initial PDF list
            this._loadPDFList();
        },

        onAskQuestion() {
            // Obtener valores de la interfaz
            const oTextArea = this.byId("chatInput");
            const sQuestion = oTextArea.getValue().trim();
            const oComboBox = this.byId("modelComboBox");
            const sSelectedModel = oComboBox.getSelectedKey();
            const oPDFModel = this.getView().getModel("pdf");
            const sSelectedPDF = oPDFModel.getProperty("/selectedPDF");

            // Validaciones centralizadas
            if (!sQuestion) {
                MessageToast.show("Por favor, ingresa una pregunta");
                return;
            }

            if (!sSelectedModel) {
                MessageBox.warning("Por favor, selecciona un modelo antes de hacer una pregunta", {
                    title: "Modelo no seleccionado"
                });
                return;
            }

            // Preparar UI para procesamiento
            this._setBusyState(true);
            oTextArea.setValue("");
            this._addMessageToChat(sQuestion, "user");

            const sLoadingMessage = sSelectedPDF ? "Analizando PDF..." : "Procesando pregunta...";
            const sLoadingId = this._addMessageToChat(sLoadingMessage, "assistant", true);

            // Llamada directa al servicio apropiado
            if (sSelectedPDF) {
                this._askAboutPDF(sQuestion, sSelectedPDF, sSelectedModel, sLoadingId);
            } else {
                this._askQuestion(sQuestion, sSelectedModel, sLoadingId);
            }
        },

        /**
         * Realiza consulta simple usando AIService
         * @param {string} sQuestion - La pregunta
         * @param {string} sSelectedModel - El modelo seleccionado
         * @param {string} sLoadingId - ID del mensaje de carga
         */
        _askQuestion(sQuestion, sSelectedModel, sLoadingId) {
            this._oAIService.askQuestion(sQuestion, sSelectedModel)
                .then((oData) => {
                    this._setBusyState(false);
                    this._removeMessageFromChat(sLoadingId);
                    
                    // La respuesta viene en oData.askQuestion.value según la imagen
                    const oResponse = oData.askQuestion?.value || oData.askQuestion || oData;
                    
                    if (oResponse && oResponse.answer) {
                        this._addMessageToChat(oResponse.answer, "assistant", false, {
                            model: oResponse.model || sSelectedModel,
                            deploymentId: oResponse.deploymentId
                        });
                        
                        if (oResponse.model) {
                            MessageToast.show(`Respuesta generada por: ${oResponse.model}`);
                        }
                    } else {
                        this._addMessageToChat("No se recibió una respuesta válida del modelo", "error");
                    }
                })
                .catch((oError) => {
                    this._setBusyState(false);
                    this._removeMessageFromChat(sLoadingId);
                    
                    const sErrorMsg = oError.message || 'Error desconocido';
                    this._addMessageToChat(sErrorMsg, "error");
                    MessageToast.show(sErrorMsg);
                });
        },

        /**
         * Realiza consulta sobre PDF usando AIService
         * @param {string} sQuestion - La pregunta
         * @param {string} sFileName - Nombre del archivo PDF
         * @param {string} sSelectedModel - El modelo seleccionado
         * @param {string} sLoadingId - ID del mensaje de carga
         */
        _askAboutPDF(sQuestion, sFileName, sSelectedModel, sLoadingId) {
            this._oAIService.askAboutPDF(sQuestion, sFileName, sSelectedModel)
                .then((oData) => {
                    this._setBusyState(false);
                    this._removeMessageFromChat(sLoadingId);
                    
                    // La respuesta viene en oData.askAboutPDF.value igual que askQuestion
                    const oResponse = oData.askAboutPDF?.value || oData.askAboutPDF || oData;
                    
                    const sAnswer = oResponse.answer;
                    const sModel = oResponse.model;
                    const sDocument = oResponse.sourceDocument;
                    const sTimestamp = oResponse.timestamp;
                    
                    if (sAnswer) {
                        // Mostrar respuesta en la UI
                        this._displayPDFResponse(oResponse);
                        
                        if (sModel) {
                            MessageToast.show(`Análisis de PDF generado por: ${sModel}`);
                        }
                    } else {
                        this._addMessageToChat("No se recibió una respuesta válida del análisis PDF", "error");
                    }
                })
                .catch((oError) => {
                    this._setBusyState(false);
                    this._removeMessageFromChat(sLoadingId);
                    
                    const sErrorMsg = oError.message || 'Error desconocido';
                    this._addMessageToChat(sErrorMsg, "error");
                    MessageToast.show(sErrorMsg);
                });
        },

        /**
         * Muestra la respuesta del análisis PDF en la interfaz
         * @param {object} oData - Datos de respuesta del servicio
         */
        _displayPDFResponse(oData) {
            const sAnswer = oData.answer;
            const sModel = oData.model;
            const sDocument = oData.sourceDocument;
            const sTimestamp = oData.timestamp;
            
            // Agregar respuesta principal
            this._addMessageToChat(sAnswer, "assistant", false, {
                model: sModel,
                sourceDocument: sDocument,
                timestamp: sTimestamp
            });
            
            // Mostrar información adicional si está disponible
            if (sDocument) {
                const sDocInfo = `📄 Documento fuente: ${sDocument}`;
                this._addMessageToChat(sDocInfo, "assistant", false, {
                    isDocumentInfo: true
                });
            }
        },

        /**
         * Adds a message to the chat
         * @param {string} sMessage - The message text
         * @param {string} sType - The message type (user, assistant, error)
         * @param {boolean} bIsLoading - Whether this is a loading message
         * @param {object} oModelInfo - Model information (optional)
         * @returns {string} Message ID for loading messages
         */
        _addMessageToChat(sMessage, sType, bIsLoading = false, oModelInfo = null) {
            const oChatModel = this.getView().getModel("chat");
            const aMessages = oChatModel.getProperty("/messages");
            
            const sMessageId = bIsLoading ? "loading_" + Date.now() : null;
            const oNewMessage = {
                id: sMessageId,
                text: sMessage,
                type: sType,
                timestamp: new Date().toLocaleTimeString(),
                fullTimestamp: new Date().toLocaleString(),
                isLoading: bIsLoading,
                model: oModelInfo?.model || null,
                deploymentId: oModelInfo?.deploymentId || null
            };

            // Simple strategy: Add all messages at the end (chronological order)
            aMessages.push(oNewMessage);
            
            oChatModel.setProperty("/messages", aMessages);

            // Scroll to bottom to show latest messages
            setTimeout(() => {
                this._scrollChatToBottom();
            }, 100);

            return sMessageId;
        },

        /**
         * Removes a message from chat (used for loading messages)
         * @param {string} sMessageId - The message ID to remove
         */
        _removeMessageFromChat(sMessageId) {
            if (!sMessageId) return;

            const oChatModel = this.getView().getModel("chat");
            const aMessages = oChatModel.getProperty("/messages");
            const aFilteredMessages = aMessages.filter(msg => msg.id !== sMessageId);
            
            oChatModel.setProperty("/messages", aFilteredMessages);
        },

        /**
         * Scrolls chat container to bottom
         */
        _scrollChatToBottom() {
            const oChatContainer = this.byId("chatContainer");
            if (oChatContainer) {
                const oDomRef = oChatContainer.getDomRef();
                if (oDomRef) {
                    oDomRef.scrollTop = oDomRef.scrollHeight;
                }
            }
        },

        /**
         * Scrolls chat container to top
         */
        _scrollChatToTop() {
            const oChatContainer = this.byId("chatContainer");
            if (oChatContainer) {
                const oDomRef = oChatContainer.getDomRef();
                if (oDomRef) {
                    oDomRef.scrollTop = 0;
                }
            }
        },

        /**
         * Sets the busy state for the ask question functionality
         * @param {boolean} bBusy - Whether to show busy state
         */
        _setBusyState(bBusy) {
            const oBusyIndicator = this.byId("askBusyIndicator");
            const oAskButton = this.byId("askButton");
            
            if (oBusyIndicator) {
                oBusyIndicator.setVisible(bBusy);
            }
            
            if (oAskButton) {
                oAskButton.setEnabled(!bBusy);
                if (bBusy) {
                    oAskButton.setText("Procesando...");
                    oAskButton.setIcon("sap-icon://busy");
                } else {
                    oAskButton.setText("Preguntar");
                    oAskButton.setIcon("sap-icon://paper-plane");
                }
            }
        },

        /**
         * Formatter for message types to MessageStrip types
         * @param {string} sMessageType - The message type (user, assistant, error)
         * @returns {string} The MessageStrip type
         */
        formatMessageType(sMessageType) {
            switch (sMessageType) {
                case "user":
                    return "Information";
                case "assistant":
                    return "Success";
                case "error":
                    return "Error";
                default:
                    return "None";
            }
        },

        /**
         * Formatter to convert Markdown formatting to HTML
         * @param {string} sText - Text with Markdown formatting
         * @returns {string} HTML formatted text
         */
formatMarkdownToHtml(sText) {
    if (!sText) return sText;
    
    let result = sText;
    
    // 1. Normalize line endings
    result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // 2. Handle headers (convert to strong tags since FormattedText has limited HTML support)
    result = result.replace(/^#{1,6}\s+(.+)$/gm, '<strong>$1</strong>');
    
    // 3. Handle horizontal rules
    result = result.replace(/^[-*_]{3,}$/gm, '<hr>');
    
    // 4. Handle code blocks (triple backticks)
    result = result.replace(/```[\s\S]*?```/g, (match) => {
        const content = match.replace(/```/g, '').trim();
        return `<code>${content}</code>`;
    });
    
    // 5. Handle inline code first (single backticks)
    result = result.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    
    // 6. Handle bold text (**text** or __text__)
    result = result.replace(/\*\*((?:[^*]|\*(?!\*))+)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/__((?:[^_]|_(?!_))+)__/g, '<strong>$1</strong>');
    
    // 7. Handle italic text (*text* or _text_) - but avoid conflicts with bold
    result = result.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
    result = result.replace(/(?<!_)_([^_\n]+)_(?!_)/g, '<em>$1</em>');
    
    // 8. Handle strikethrough (~~text~~)
    result = result.replace(/~~(.*?)~~/g, '<s>$1</s>');
    
    // 9. Handle unordered lists
    result = result.replace(/^\s*[-*+]\s+(.+)$/gm, '• $1');
    
    // 10. Handle ordered lists
    result = result.replace(/^\s*\d+\.\s+(.+)$/gm, (match, content, offset, string) => {
        // Count how many numbered items we've seen before this one
        const beforeThis = string.substring(0, offset);
        const numberedItems = (beforeThis.match(/^\s*\d+\.\s+/gm) || []).length;
        return `${numberedItems + 1}. ${content}`;
    });
    
    // 11. Handle links [text](url)
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // 12. Handle blockquotes
    result = result.replace(/^>\s*(.+)$/gm, '<em>"$1"</em>');
    
    // 13. Handle line breaks properly
    // Convert paragraph breaks (double line breaks) to double <br> for proper separation
    result = result.replace(/\n\s*\n/g, '<br><br>');
    
    // Convert single line breaks to single <br> to maintain structure
    result = result.replace(/\n/g, '<br>');
    
    // 14. Clean up excessive breaks - allow up to 2 consecutive breaks for readability
    result = result.replace(/<br>\s*<br>\s*<br>+/g, '<br>'); // Max 2 consecutive breaks
    result = result.replace(/^\s*<br>+/g, ''); // Remove leading breaks
    result = result.replace(/<br>+\s*$/g, ''); // Remove trailing breaks
    
    // 15. Clean up extra whitespace
    result = result.replace(/[ \t]+/g, ' '); // Multiple spaces/tabs to single space
    result = result.replace(/\s+<br>/g, '<br>'); // Remove spaces before breaks
    result = result.replace(/<br>\s+/g, '<br>'); // Remove spaces after breaks
    
    return result.trim();
},

        /**
         * Handles input change to update character count and send button state
         * @param {sap.ui.base.Event} oEvent - The input change event
         */
        onInputChange(oEvent) {
            const sValue = oEvent.getParameter("value");
            const oUIModel = this.getView().getModel("ui");
            
            // Update input length
            oUIModel.setProperty("/inputLength", sValue.length);
            
            // Update send button state
            this._updateSendButtonState();
        },

        /**
         * Handles new chat button press
         */
        onNewChat() {
            const oChatModel = this.getView().getModel("chat");
            oChatModel.setProperty("/messages", []);
            
            // Clear input
            const oTextArea = this.byId("chatInput");
            if (oTextArea) {
                oTextArea.setValue("");
            }
            
            // Clear attached file
            this._clearAttachedFile();
            
            // Reset UI state
            const oUIModel = this.getView().getModel("ui");
            oUIModel.setProperty("/inputLength", 0);
            oUIModel.setProperty("/canSend", false);
            
            MessageToast.show("Nuevo chat iniciado");
        },

        /**
         * Handles copy message button press
         * @param {sap.ui.base.Event} oEvent - The button press event
         */
        onCopyMessage(oEvent) {
            const oBindingContext = oEvent.getSource().getBindingContext("chat");
            const sText = oBindingContext.getProperty("text");
            
            // Use the Clipboard API if available
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(sText).then(() => {
                    MessageToast.show("Mensaje copiado al portapapeles");
                }).catch(() => {
                    MessageToast.show("Error al copiar el mensaje");
                });
            } else {
                // Fallback for older browsers
                const textArea = document.createElement("textarea");
                textArea.value = sText;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    MessageToast.show("Mensaje copiado al portapapeles");
                } catch (err) {
                    MessageToast.show("Error al copiar el mensaje");
                }
                document.body.removeChild(textArea);
            }
        },

        /**
         * Formatter for assistant title with model name
         * @param {string} sModel - The model name
         * @returns {string} Formatted title string with HTML
         */
        formatAssistantTitle(sModel) {
            if (sModel) {
                return `<strong>AI Assistant - ${sModel}</strong>`;
            }
            return "<strong>AI Assistant</strong>";
        },

        /**
         * Formatter for assistant info (model and timestamp)
         * @param {string} sModel - The model name
         * @param {string} sTimestamp - The timestamp
         * @returns {string} Formatted info string
         */
        formatAssistantInfo(sModel, sTimestamp) {
            let sInfo = "";
            if (sModel) {
                sInfo += `Modelo: ${sModel}`;
            }
            if (sTimestamp) {
                if (sInfo) sInfo += " • ";
                sInfo += sTimestamp;
            }
            return sInfo;
        },

        /**
         * Handles attach file button press
         */
        onAttachFile() {
            // Trigger the hidden file input
            const oFileInput = document.getElementById("fileInput");
            if (oFileInput) {
                oFileInput.click();
                
                // Add event listener for file selection
                oFileInput.onchange = (event) => {
                    const oFile = event.target.files[0];
                    if (oFile) {
                        this._handleFileSelection(oFile);
                    }
                };
            }
        },

        /**
         * Handles file selection from the file input
         * @param {File} oFile - The selected file
         */
        _handleFileSelection(oFile) {
            // Validate file type
            if (oFile.type !== "application/pdf") {
                MessageBox.error("Solo se permiten archivos PDF", {
                    title: "Tipo de archivo no válido"
                });
                // Clear the file input
                const oFileInput = document.getElementById("fileInput");
                if (oFileInput) {
                    oFileInput.value = "";
                }
                return;
            }

            // Validate file size (max 10MB)
            const nMaxSize = 10 * 1024 * 1024; // 10MB in bytes
            if (oFile.size > nMaxSize) {
                MessageBox.error("El archivo es demasiado grande. Tamaño máximo: 10MB", {
                    title: "Archivo demasiado grande"
                });
                // Clear the file input
                const oFileInput = document.getElementById("fileInput");
                if (oFileInput) {
                    oFileInput.value = "";
                }
                return;
            }

            // Update UI model
            const oUIModel = this.getView().getModel("ui");
            oUIModel.setProperty("/attachedFile", oFile);
            oUIModel.setProperty("/hasAttachedFile", true);
            oUIModel.setProperty("/attachedFileName", oFile.name);

            // Update button state
            this._updateSendButtonState();

            MessageToast.show(`Archivo adjuntado: ${oFile.name}`);
        },

        /**
         * Handles file upload change event (legacy method for compatibility)
         * @param {sap.ui.base.Event} oEvent - The file change event
         */
        onFileChange(oEvent) {
            const oFileUploader = oEvent.getSource();
            const oFile = oEvent.getParameter("files") && oEvent.getParameter("files")[0];
            
            if (!oFile) {
                return;
            }

            this._handleFileSelection(oFile);
        },

        /**
         * Handles removing attached file
         */
        onRemoveFile() {
            this._clearAttachedFile();
            MessageToast.show("Archivo removido");
        },

        /**
         * Clears the attached file from UI model
         */
        _clearAttachedFile() {
            const oUIModel = this.getView().getModel("ui");
            oUIModel.setProperty("/attachedFile", null);
            oUIModel.setProperty("/hasAttachedFile", false);
            oUIModel.setProperty("/attachedFileName", "");

            // Clear file uploader
            const oFileUploader = this.byId("fileUploader");
            if (oFileUploader) {
                oFileUploader.clear();
            }

            // Update button state
            this._updateSendButtonState();
        },

        /**
         * Updates the send button state and text based on current conditions
         */
        _updateSendButtonState() {
            const oUIModel = this.getView().getModel("ui");
            const oPDFModel = this.getView().getModel("pdf");
            const oTextArea = this.byId("chatInput");
            const oAskButton = this.byId("askButton");
            
            const sValue = oTextArea ? oTextArea.getValue().trim() : "";
            const sSelectedPDF = oPDFModel ? oPDFModel.getProperty("/selectedPDF") : null;
            
            // Update send button state - solo requiere texto
            const bCanSend = sValue.length > 0;
            oUIModel.setProperty("/canSend", bCanSend);
            
            // Update button text, icon and style based on selected PDF
            if (oAskButton) {
                oAskButton.setEnabled(bCanSend);
                
                if (sSelectedPDF) {
                    oAskButton.setText("Consultar PDF");
                    oAskButton.setIcon("sap-icon://pdf-reader");
                    oAskButton.setType("Accept"); // Verde
                    oAskButton.setTooltip(`Consultar PDF: ${sSelectedPDF}`);
                } else {
                    oAskButton.setText("Enviar");
                    oAskButton.setIcon("sap-icon://paper-plane");
                    oAskButton.setType("Emphasized"); // Azul
                    oAskButton.setTooltip("Enviar mensaje");
                }
            }
        },

        /**
         * Formatter for file attachment display
         * @param {string} sFileName - The file name
         * @returns {string} Formatted file display text
         */
        formatFileDisplay(sFileName) {
            if (!sFileName) return "";
            return `📄 ${sFileName}`;
        },

        onAnalyzePDF() {
            // This method is now handled by onAskQuestion when file is attached
            this.onAskQuestion();
        },

        // ========== PDF MANAGEMENT METHODS ==========

        /**
         * Loads the list of uploaded PDFs from the server
         */
        _loadPDFList() {
            const oPDFModel = this.getView().getModel("pdf");
            
            // TODO: Implementar llamada real al servidor para obtener PDFs
            // Por ahora, inicializar con lista vacía
            oPDFModel.setProperty("/pdfs", []);
            
            // Llamada futura al servidor:
            // const oModel = this.getOwnerComponent().getModel();
            // oModel.callFunction("/getPDFList", {
            //     success: (oData) => {
            //         oPDFModel.setProperty("/pdfs", oData.results || []);
            //     },
            //     error: (oError) => {
            //         console.error("Error loading PDF list:", oError);
            //         oPDFModel.setProperty("/pdfs", []);
            //     }
            // });
        },

        /**
         * Handles model selection change
         * @param {sap.ui.base.Event} oEvent - The selection change event
         */
        onModelChange(oEvent) {
            const sSelectedKey = oEvent.getParameter("selectedItem").getKey();
            const oUIModel = this.getView().getModel("ui");
            
            // Update selected model
            oUIModel.setProperty("/selectedModel", sSelectedKey);
            
            // Update send button state
            this._updateSendButtonState();
            
            if (sSelectedKey) {
                MessageToast.show(`Modelo seleccionado: ${sSelectedKey}`);
            }
        },

        /**
         * Handles file selection in FileUploader
         * @param {sap.ui.base.Event} oEvent - The file change event
         */
        onFileChange(oEvent) {
            const oFileUploader = oEvent.getSource();
            const sFileName = oFileUploader.getValue();
            const oUploadButton = this.byId("uploadButton");
            
            // Enable upload button if file is selected
            if (sFileName) {
                oUploadButton.setEnabled(true);
                MessageToast.show(`Archivo seleccionado: ${sFileName}`);
            } else {
                oUploadButton.setEnabled(false);
            }
        },

        /**
         * Handles upload button press
         */
        onUploadPress() {
            const oFileUploader = this.byId("pdfUploader");
            const sFileName = oFileUploader.getValue();
            
            if (!sFileName) {
                MessageToast.show("Por favor, selecciona un archivo PDF");
                return;
            }

            // Get the actual file from the FileUploader
            const oFile = oFileUploader.oFileUpload.files[0];
            if (!oFile) {
                MessageToast.show("Error: No se pudo obtener el archivo");
                return;
            }

            // Start upload process
            this._startUploadProcess(oFile);
        },

        /**
         * Starts the upload process
         * @param {File} oFile - The file to upload
         */
        _startUploadProcess(oFile) {
            const oPDFModel = this.getView().getModel("pdf");
            const oUploadButton = this.byId("uploadButton");
            
            // Set uploading state
            oPDFModel.setProperty("/isUploading", true);
            oPDFModel.setProperty("/uploadProgress", 0);
            oUploadButton.setEnabled(false);
            
            MessageToast.show("Iniciando subida del PDF...");
            
            // Simulate progress
            this._simulateUploadProgress();
            
            // TEMPORAL: Simular subida exitosa
            setTimeout(() => {
                const oResponse = {
                    success: true,
                    fileName: oFile.name,
                    message: `PDF "${oFile.name}" subido exitosamente (simulado)`,
                    processing: true
                };
                this._handleUploadSuccess(oResponse, oFile.name);
                
                // Agregar PDF simulado a la lista
                this._addSimulatedPDF(oFile.name);
            }, 2000);
        },

        /**
         * Adds a simulated PDF to the list
         * @param {string} sFileName - The file name
         */
        _addSimulatedPDF(sFileName) {
            const oPDFModel = this.getView().getModel("pdf");
            const aPDFs = oPDFModel.getProperty("/pdfs") || [];
            
            // Agregar PDF simulado
            const oNewPDF = {
                fileName: sFileName,
                uploadDate: new Date().toISOString(),
                status: "processing",
                wordCount: 0
            };
            
            aPDFs.push(oNewPDF);
            oPDFModel.setProperty("/pdfs", aPDFs);
            
            // Simular procesamiento completado después de 3 segundos
            setTimeout(() => {
                const aUpdatedPDFs = oPDFModel.getProperty("/pdfs");
                const oPDF = aUpdatedPDFs.find(pdf => pdf.fileName === sFileName);
                if (oPDF) {
                    oPDF.status = "processed";
                    oPDF.wordCount = Math.floor(Math.random() * 5000) + 1000;
                    oPDFModel.setProperty("/pdfs", aUpdatedPDFs);
                    MessageToast.show(`PDF "${sFileName}" procesado y listo para consultas`);
                }
            }, 3000);
        },

        /**
         * Handles successful upload
         * @param {object} oResponse - Upload response
         * @param {string} sFileName - File name
         */
        _handleUploadSuccess(oResponse, sFileName) {
            const oPDFModel = this.getView().getModel("pdf");
            const oFileUploader = this.byId("pdfUploader");
            const oUploadButton = this.byId("uploadButton");
            
            // Reset uploading state
            oPDFModel.setProperty("/isUploading", false);
            oPDFModel.setProperty("/uploadProgress", 100);
            oUploadButton.setEnabled(false);
            
            // Clear file uploader
            oFileUploader.clear();
            
            // Show success message
            MessageToast.show(oResponse.message || "PDF subido exitosamente");
            
            // Show processing message if applicable
            if (oResponse.processing) {
                MessageToast.show("El PDF está siendo procesado. Estará disponible para consultas en breve.");
            }
            
            // Reset progress after a delay
            setTimeout(() => {
                oPDFModel.setProperty("/uploadProgress", 0);
            }, 2000);
        },

        /**
         * Handles file type mismatch
         * @param {sap.ui.base.Event} oEvent - The type mismatch event
         */
        onTypeMismatch(oEvent) {
            MessageBox.error("Solo se permiten archivos PDF", {
                title: "Tipo de archivo no válido"
            });
        },

        /**
         * Handles file size exceed
         * @param {sap.ui.base.Event} oEvent - The file size exceed event
         */
        onFileSizeExceed(oEvent) {
            MessageBox.error("El archivo es demasiado grande. Tamaño máximo: 10MB", {
                title: "Archivo demasiado grande"
            });
        },

        /**
         * Handles PDF selection from the list
         * @param {sap.ui.base.Event} oEvent - The selection change event
         */
        onPDFSelect(oEvent) {
            const oSelectedItem = oEvent.getParameter("listItem");
            const oPDFModel = this.getView().getModel("pdf");
            const oPDFList = oEvent.getSource();
            
            if (oSelectedItem) {
                const sFileName = oSelectedItem.getCustomData()[0].getValue();
                const sStatus = oSelectedItem.getCustomData()[1].getValue();
                const sCurrentSelected = oPDFModel.getProperty("/selectedPDF");
                
                // Si el mismo PDF ya está seleccionado, deseleccionarlo
                if (sCurrentSelected === sFileName) {
                    oPDFModel.setProperty("/selectedPDF", null);
                    oPDFList.setSelectedItem(null);
                    MessageToast.show("PDF deseleccionado");
                    this._updateSendButtonState();
                    return;
                }
                
                // Validate PDF status
                if (sStatus !== "processed") {
                    MessageBox.warning(`El PDF "${sFileName}" aún no está procesado. Estado actual: ${sStatus}`, {
                        title: "PDF no disponible"
                    });
                    
                    // Deselect the item
                    oPDFList.setSelectedItem(null);
                    return;
                }
                
                // Set selected PDF
                oPDFModel.setProperty("/selectedPDF", sFileName);
                MessageToast.show(`PDF seleccionado: ${sFileName}`);
                
                // Update button state
                this._updateSendButtonState();
            }
        },

        /**
         * Handles deselecting PDF
         */
        onDeselectPDF() {
            const oPDFModel = this.getView().getModel("pdf");
            const oPDFList = this.byId("pdfList");
            
            // Clear selection
            oPDFModel.setProperty("/selectedPDF", null);
            oPDFList.setSelectedItem(null);
            
            MessageToast.show("PDF deseleccionado");
            
            // Update button state
            this._updateSendButtonState();
        },

        /**
         * Simulates upload progress
         */
        _simulateUploadProgress() {
            const oPDFModel = this.getView().getModel("pdf");
            let nProgress = 0;
            
            const oInterval = setInterval(() => {
                nProgress += Math.random() * 20;
                if (nProgress >= 100) {
                    nProgress = 100;
                    clearInterval(oInterval);
                }
                oPDFModel.setProperty("/uploadProgress", nProgress);
            }, 500);
        },

        /**
         * Formatter for PDF status icons
         * @param {string} sStatus - The PDF status
         * @returns {string} The icon name
         */
        formatPDFStatusIcon(sStatus) {
            switch (sStatus) {
                case "uploaded":
                    return "sap-icon://upload";
                case "processing":
                    return "sap-icon://busy";
                case "processed":
                    return "sap-icon://accept";
                case "error":
                    return "sap-icon://error";
                default:
                    return "sap-icon://document";
            }
        },

        /**
         * Formatter for selected PDF message
         * @param {string} sFileName - The selected PDF file name
         * @returns {string} Formatted message for MessageStrip
         */
        formatSelectedPDFMessage(sFileName) {
            if (!sFileName) return "";
            return `📄 ${sFileName}`;
        }
    });
});
