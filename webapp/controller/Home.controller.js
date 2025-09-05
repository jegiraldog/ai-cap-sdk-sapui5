sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], (Controller, JSONModel, MessageToast) => {
    "use strict";

    return Controller.extend("com.globant.aichat.aichatpdfui5.controller.Home", {
        onInit() {
            const oViewModel = new JSONModel({
                availableModels: [],
                selectedModelId: ""
            });
            this.getView().setModel(oViewModel, "viewModel");

            // Opción 1: Esperar a que el modelo esté disponible
            const oModel = this.getView().getModel();
            if (oModel) {
                this._loadAvailableModels();
            } else {
                // Esperar a que el modelo se inicialice
                this.getView().attachModelContextChange(() => {
                    const oModelReady = this.getView().getModel();
                    if (oModelReady && !this._modelsLoaded) {
                        this._modelsLoaded = true;
                        this._loadAvailableModels();
                    }
                });
            }
        },

        _loadAvailableModels_() {
            const oModel = this.getView().getModel();

            // Hacer POST directo al endpoint
            jQuery.ajax({
                url: "/odata/v4/ai/getAvailableModels",
                method: "POST",
                success: (data) => {
                    const oViewModel = this.getView().getModel("viewModel");
                    oViewModel.setProperty("/availableModels", data.value || data);
                    MessageToast.show("Modelos cargados");
                },
                error: (error) => {
                    console.error("Error:", error);
                    MessageToast.show("Error al cargar modelos");
                }
            });
        }

    });
});
