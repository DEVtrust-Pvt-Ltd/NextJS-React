import ActionTypes from "@/contexts/app/actionTypes";
import { useAppContext } from "@/contexts/app/app.context";
import { useMutation } from "@apollo/client";
import React, { useState } from "react";
import ReactTooltip from "react-tooltip";
import { ClearCrate, ClearCrateVariables } from "types/generated/ClearCrate";
import { GetCrateSongs } from "types/generated/GetCrateSongs";
import DubModal from "../DubModal";
import { useToast } from "../DubToast/useToast";
import Loader from "../Loader";
import { CLEAR_CRATE, GET_CRATE_SONGS } from "./Query";

interface ClearCrateProps {
  crateId: number;
}

const ClearCrateComponent: React.FC<ClearCrateProps> = (props) => {
  const { crateId } = props;
  const { showToast } = useToast();
  const [, appDispatch] = useAppContext();
  const [showModal, setShowModal] = useState(false);
  const [clearCrate, { loading }] = useMutation<ClearCrate, ClearCrateVariables>(CLEAR_CRATE);

  const clear = () => {
    clearCrate({
      variables: {
        crateId,
      },
      update: (proxy) => {
        // Read the data from our cache for this query.
        const data = proxy.readQuery<GetCrateSongs>({ query: GET_CRATE_SONGS });
        if (!data) return;
        // Write our data back to the cache with the new comment in it
        proxy.writeQuery<GetCrateSongs>({
          query: GET_CRATE_SONGS,
          data: {
            ...data,
            crate: [
              {
                __typename: data.crate[0].__typename,
                crate_id: data.crate[0].crate_id,
                uri: null,
                crate_songs: [],
              },
            ],
          },
        });
      },
    }).then(() => {
      appDispatch({
        type: ActionTypes.SET_APP_STATE_VALUE,
        payload: { crateSongs: [] },
      });
      showToast("Cleared", "Successfully cleared crate");
    });
  };

  return (
    <>
      {loading ? (
        <Loader />
      ) : (
        <>
          <button data-tip data-for="clearcrate" className="relative mx-1" onClick={() => setShowModal(true)}>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
          <ReactTooltip id="clearcrate" type="dark">
            <span>Clear Crate</span>
          </ReactTooltip>
        </>
      )}
      <DubModal
        isShown={showModal}
        isLoading={loading}
        title="Clear crate?"
        content="Are you sure? This action cannot be reversed."
        dismissButtonText="Cancel"
        proceedButtonText="Clear"
        onDismiss={() => setShowModal(false)}
        onProceed={clear}
      />
    </>
  );
};

export default ClearCrateComponent;
