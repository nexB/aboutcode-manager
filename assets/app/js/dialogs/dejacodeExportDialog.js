/*
 #
 # Copyright (c) 2017 nexB Inc. and others. All rights reserved.
 # https://nexb.com and https://github.com/nexB/scancode-toolkit/
 # The ScanCode software is licensed under the Apache License version 2.0.
 # AboutCode is a trademark of nexB Inc.
 #
 # You may not use this software except in compliance with the License.
 # You may obtain a copy of the License at: http://apache.org/licenses/LICENSE-2.0
 # Unless required by applicable law or agreed to in writing, software distributed
 # under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 # CONDITIONS OF ANY KIND, either express or implied. See the License for the
 # specific language governing permissions and limitations under the License.
 #
 */

const Progress = require('../helpers/progress');

class DejaCodeExportDialog {
    constructor(dialogId, aboutCodeDB) {
        this.aboutCodeDB = aboutCodeDB;

        // Get product name and version
        this.dialog = $(dialogId);
        this.productName = this.dialog.find("#product-name");
        this.productVersion = this.dialog.find("#product-version");
        this.apiUrl = this.dialog.find("#apiURLDejaCode");
        this.apiKey = this.dialog.find("#apiKey");
        this.submitButton = this.dialog.find("button#componentSubmit");
        this.submitButton.click(() => this._exportComponents());
        this.progressBar = new Progress("#tab-component .components-table-container",
            {
                title: "Uploading Components ... ",
                size: 100
            });
    }

    database(aboutCodeDB) {
        this.aboutCodeDB = aboutCodeDB;
    }

    show() {
        this.dialog.modal('show');
    }

    // Submit components to a DejaCode Product via ProductComponent API
    // TODO (@jdaguil): DejaCode doesn't require any field, but we probably
    // want to require name, version, and owner
    _exportComponents() {
        this.progressBar.showIndeterminate();
        return this.aboutCodeDB.db
            .then(() => this.aboutCodeDB.findAllComponents({}))
            .then(components => {
                // Get product name and version
                const productName = this.productName.val();
                const productVersion = this.productVersion.val();
                const productNameVersion = productName.concat(":", productVersion);
                const apiUrl = this.apiUrl.val();
                const apiKey = this.apiKey.val();

                // Test whether any form field is empty
                if (productName === "" || productVersion === "" || apiUrl === "" || apiKey === "") {
                    throw new Error("Please make sure you complete all fields in the upload form.");
                }

                this.dialog.modal('hide');

                // Converts array of components from AboutCode Manager to
                // DejaCode component format
                const dejaCodeComponents = $.map(components, component => {
                    return {
                        name: component.name,
                        version: component.version,
                        owner: component.owner,
                        license_expression: component.license_expression,
                        copyright: component.copyright,
                        is_deployed: component.is_deployed,
                        is_modified: component.is_modified,
                        homepage_url: component.homepage_url,
                        primary_language: component.programming_language,
                        reference_notes: component.notes,
                        feature: component.feature,
                        purpose: component.purpose,
                        product: productNameVersion
                    };
                });
                return this._uploadComponents(apiUrl, apiKey, dejaCodeComponents);
            })
            .then(() => this.progressBar.hide())
            // TODO: throw an exception and handle this in render with
            // dialog.showErrorBox
            .then(() => alert("Components submitted to DejaCode"))
            .catch((err) => {
                this.progressBar.hide();
                throw err;
            });
    }

    // Upload created Components to a Product in DejaCode using the API
    _uploadComponents(host, apiKey, components) {
        let errorMessages = {};

        // Make individual requests to DejaCode to create each component
        const requests = $.map(components, (component, index) => {
            return this._createComponent(host, apiKey, component)
                .catch(err => errorMessages[component.name] = err);
        });

        // This will be called when all requests finish.
        return Promise.all(requests)
            .then(() => {
                if (Object.keys(errorMessages).length > 0) {
                    let msg = $.map(errorMessages, function(errorMessage, component) {
                        return component + ": " + errorMessage;
                    });
                    throw new Error("The following errors occurred:\n" + msg.join("\n\n"));
                }
            });
    }

    // Uses DejaCode API to create a component
    _createComponent(productComponentUrl, apiKey, component) {
        const headers = {
            'Authorization': 'Token ' + apiKey,
            'Accept': 'application/json; indent=4'
        };

        return new Promise((resolve, reject) => {
            $.ajax({
                type: 'POST',
                headers: headers,
                url: productComponentUrl,
                data: component,
            })
                .done(data => resolve(data))
                .fail(err => reject(err));
        });
    }
}

module.exports = DejaCodeExportDialog;