const axios = require("axios");
const convert = require("xml-js");
const request = require("request");
// const { response } = require("express");

module.exports = app => {
  //USPS Tracking api
  app.get("/tracking/usps/:id", (req, res) => {
    //Call a POST request to some url to return xml
    axios({
      method: "POST",
      url:
        "https://secure.shippingapis.com/ShippingAPI.dll?API=TrackV2&XML=<TrackRequest USERID=" +
        JSON.stringify(process.env.USPS_USER_ID) +
        "><TrackID ID=" +
        JSON.stringify(req.params.id) +
        "></TrackID></TrackRequest>"
    }).then(response => {
      // console.log(typeof response.data);
      //the res.data is xml and needs to be converted to json
      const xml = response.data;
      const result = convert.xml2json(xml, { compact: true, spaces: 4 });
      // console.log(result);
      if (result.includes("Error")) {
        res.send("Error: Invalid Input");
      } else if (
        result.includes("TrackSummary") &&
        result.includes("TrackDetail")
      ) {
        const beginningtrackSummaryLocation = result.search("_text");
        const endtrackSummaryLocation = result.search("TrackDetail");
        // console.log(
        //   beginningtrackSummaryLocation + " " + endtrackSummaryLocation
        // );
        const trackSummary = result.substring(
          beginningtrackSummaryLocation - 1,
          endtrackSummaryLocation - 1
        );
        // console.log(trackSummary);
        res.send(trackSummary);
      } else {
        const beginningtrackSummaryLocation = result.search("_text");
        // const endtrackSummaryLocation = result.search("TrackDetail");
        const trackSummary = result.substring(
          beginningtrackSummaryLocation - 1,
          result.length - 5
        );
        // console.log(result);
        res.send(trackSummary);
      }
    });
  });

  //CHANGED API CALL to shipengine passing ID for tracking
  app.get("/tracking/shipengine/fedex/:id", (req, res) => {
    const id = req.params.id;
    const options = {
      method: "GET",
      url:
        "https://api.shipengine.com/v1/tracking?carrier_code=fedex&tracking_number=" +
        id,
      headers: {
        Host: "api.shipengine.com",
        "API-Key": "TEST_KrVo/J2myk1/PbESqE+JUQf/Je4eAENJylD6g4B4iGU"
      }
    };
    request(options, (error, response) => {
      if (error) {
        throw new Error(error);
      }
      // console.log(typeof response.body);
      const beginningtrackSummaryLocation = response.body.search("status_code");
      const endtrackSummaryLocation = response.body.search(
        "carrier_detail_code"
      );
      // console.log(
      //   beginningtrackSummaryLocation + " " + endtrackSummaryLocation
      // );
      const trackSummary = response.body.substring(
        beginningtrackSummaryLocation - 1,
        endtrackSummaryLocation - 1
      );
      res.send(trackSummary);
    });
  });

  // UPS Call returns JSON, THANK YOU!!!
  // Changed password... Now doesn't work
  app.get("/tracking/ups/:id", (req, res) => {
    const packageID = req.params.id;

    axios({
      method: "POST",
      url: "https://onlinetools.ups.com/json/Track",
      data: {
        Security: {
          UsernameToken: {
            Username: process.env.UPS_USERNAME,
            Password: process.env.UPS_PASSWORD
          },
          UPSServiceAccessToken: {
            AccessLicenseNumber: process.env.UPS_ACCESSID
          }
        },
        TrackRequest: {
          Request: {
            RequestAction: "Track",
            RequestOption: "activity"
          },

          InquiryNumber: JSON.stringify(packageID)
        }
      }
    }).then(response => {
      // console.log(
      //   response.data.TrackResponse.Shipment.Package.Activity[0].Status
      // );
      const detailsofPackage = response.data.Fault;
      if (detailsofPackage) {
        res.send(response.data.Fault.detail.Errors);
      } else if (
        response.data.TrackResponse.Shipment.Package.Activity[0].Status
      ) {
        res.send(
          response.data.TrackResponse.Shipment.Package.Activity[0].Status
        );
      } else {
        res.send("YOU SERIOUSLY MESSED THIS UP!");
      }
    });
  });
};
