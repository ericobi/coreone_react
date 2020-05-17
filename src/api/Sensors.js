import { API, graphqlOperation } from "aws-amplify";
import {
  listCoreOneIncomingDatas,
  listCoreOneAssigneds,
} from "../graphql/queries";
import { createCoreOneOutgoingData } from "../graphql/mutations";
import { onUpdateCoreOneIncomingDataValue } from "../graphql/subscriptions";

export const GetSensorStatusColor = (status) => {
  let r = "";
  if (status) {
    r = "green";
  } else {
    r = "red";
  }

  return r;
};

export const createCoreOneOutgoing = async (value) => {
  try {
    const res = await API.graphql(
      graphqlOperation(createCoreOneOutgoingData, value)
    );
    console.log("created outgoing data: ", res);
  } catch (error) {
    console.log(error);
  }
};

export const selectSensor = (sensor) => {
  return (dispatch) => {
    dispatch({ type: "SELECT_SENSOR", currentSensor: sensor });
  };
};

export const GetSensors = () => {
  return async (dispatch, getState) => {
    try {
      // get devices id list
      const resCDs = await API.graphql(graphqlOperation(listCoreOneAssigneds));
      const cds = resCDs.data.listCoreOneAssigneds.items;

      // get my devices list
      const resSensors = await API.graphql(
        graphqlOperation(listCoreOneIncomingDatas)
      );
      let sensors = resSensors.data.listCoreOneIncomingDatas.items;

      let mysensors = [];

      for (let cd of cds) {
        if (cd.client_id === getState().user.userData.sub) {
          let data = [];
          for (let sensor of sensors) {
            if (cd.device_id === sensor.device_id) {
              data.push({
                timestamp: sensor.timestamp,
                payload: JSON.parse(sensor.payload),
              });
            }
          }
          mysensors.push({
            device_id: cd.device_id,
            device_type: cd.device_type,
            data: data,
          });
        }
      }

      dispatch({ type: "GET_SENSORS_LIST", getSensorsList: mysensors });
      return mysensors;
    } catch (error) {
      console.log(error);
    }
  };
};

export const SubscribeSensor = (device_id) => {
  return (dispatch) => {
    const subscriber = API.graphql(
      graphqlOperation(onUpdateCoreOneIncomingDataValue, {
        device_id: device_id,
      })
    ).subscribe({
      next: (response) => {
        const sensor = response.value.data.onUpdateCoreOneIncomingDataValue;
        if (sensor && sensor.device_id === device_id) {
          sensor.payload = JSON.parse(sensor.payload);
          sensor.payload = JSON.parse(sensor.payload);
          dispatch({
            type: "UPDATE_SENSOR",
            currentSensor: sensor,
          });
        }
      },
      error: (error) => {
        console.log("error on sensor subscription", error);
      },
    });

    return () => {
      console.log("terminating subscription to sensor", device_id);
      subscriber.unsubscribe();
    };
  };
};
