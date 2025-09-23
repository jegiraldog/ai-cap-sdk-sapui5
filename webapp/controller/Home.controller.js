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
                inputLength: 0
            });
            this.getView().setModel(oUIModel, "ui");
        },

        onAskQuestion() {
            // Get the question from the input
            const oTextArea = this.byId("chatInput");
            const sQuestion = oTextArea.getValue().trim();

            // Validate question
            if (!sQuestion) {
                MessageToast.show("Por favor, ingresa una pregunta");
                return;
            }

            // Get selected model
            const oComboBox = this.byId("modelComboBox");
            const sSelectedModel = oComboBox.getSelectedKey();

            // Validate model selection
            if (!sSelectedModel) {
                MessageBox.warning("Por favor, selecciona un modelo antes de hacer una pregunta", {
                    title: "Modelo no seleccionado"
                });
                return;
            }

            // Show busy indicator and disable button
            this._setBusyState(true);

            // Clear input
            oTextArea.setValue("");

            // Add user message first
            this._addMessageToChat(sQuestion, "user");

            // Show loading message after user message
            const sLoadingId = this._addMessageToChat("Procesando pregunta...", "assistant", true);

            // Call AI service
            this._oAIService.askQuestion(sQuestion, sSelectedModel)
                .then((oResponse) => {
                    // Hide busy indicator and enable button
                    this._setBusyState(false);

                    // Remove loading message
                    this._removeMessageFromChat(sLoadingId);

                    // Add AI response to chat
                    if (oResponse && oResponse.askQuestion && oResponse.askQuestion.value && oResponse.askQuestion.value.answer) {
                        // Add model info to the response
                        const sModelInfo = oResponse.askQuestion.value.model || sSelectedModel;
                        const sDeploymentInfo = oResponse.askQuestion.value.deploymentId || '';
                        
                        this._addMessageToChat(oResponse.askQuestion.value.answer, "assistant", false, {
                            model: sModelInfo,
                            deploymentId: sDeploymentInfo
                        });
                        
                        // Show model info in a subtle way
                        if (sModelInfo) {
                            MessageToast.show(`Respuesta generada por: ${sModelInfo}`);
                        }
                    } else {
                        this._addMessageToChat("No se recibió una respuesta válida del modelo", "error");
                    }
                })
                .catch((oError) => {
                    // Hide busy indicator and enable button
                    this._setBusyState(false);

                    // Remove loading message
                    this._removeMessageFromChat(sLoadingId);

                    // Show error message
                    const sErrorMessage = oError.message || "Error al procesar la pregunta";
                    this._addMessageToChat(sErrorMessage, "error");
                    
                    MessageBox.error(sErrorMessage, {
                        title: "Error en la consulta"
                    });
                });
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
            const oComboBox = this.byId("modelComboBox");
            const sSelectedModel = oComboBox.getSelectedKey();
            
            // Update input length
            oUIModel.setProperty("/inputLength", sValue.length);
            
            // Update send button state
            const bCanSend = sValue.trim().length > 0 && sSelectedModel;
            oUIModel.setProperty("/canSend", bCanSend);
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

        onAnalyzePDF() {
            // TODO: Implement PDF analysis functionality
        }
    });
});
