import React from "react";
import cx from "classnames";

import Play from "../Icons/play";
import Pause from "../Icons/pause";
import { useMutation } from "@apollo/client";
import { GET_CRATE_SONGS, REMOVE_SONG_FROM_CRATE } from "./Query";
import { RemoveSongFromCrate, RemoveSongFromCrateVariables } from "types/generated/RemoveSongFromCrate";
import { useToast } from "../DubToast/useToast";
import Loader from "../Loader";
import { GetCrateSongs } from "types/generated/GetCrateSongs";
import { useAppContext } from "@/contexts/app/app.context";
import ActionTypes from "@/contexts/app/actionTypes";

interface ChartListEntryProps {
  songId: string;
  crateId: number;
  title: string;
  artist: string;
  version: string;
  isActive: boolean;
  isPlaying: boolean;
  onPlayPauseTrack: () => void;
}

const ChartListEntry: React.FC<ChartListEntryProps> = (props) => {
  const { songId, crateId, title, artist, version, isActive, isPlaying, onPlayPauseTrack = () => null } = props;
  const { showToast } = useToast();
  const [appState, appDispatch] = useAppContext();

  const [removeFromCrate, { loading: loadingRemove }] = useMutation<RemoveSongFromCrate, RemoveSongFromCrateVariables>(
    REMOVE_SONG_FROM_CRATE
  );

  const remove = () => {
    removeFromCrate({
      variables: {
        songId,
        crateId,
      },
      update: (proxy, { data: { delete_crate_songs_by_pk } }) => {
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
                uri: null,
                crate_id: data.crate[0].crate_id,
                crate_songs: data.crate[0].crate_songs.filter(
                  (el) => el.song.song_id !== delete_crate_songs_by_pk.song_id_Song
                ),
              },
            ],
          },
        });
      },
    }).then(({ data: { delete_crate_songs_by_pk } }) => {
      appDispatch({
        type: ActionTypes.SET_APP_STATE_VALUE,
        payload: {
          crateSongs: appState.crateSongs.filter((el) => el !== delete_crate_songs_by_pk.song_id_Song),
        },
      });
      showToast("Removed", "Removed song from crate");
    });
  };

  return (
    <div
      className={cx("relative rounded-sm px-3 py-1 m-1 h-12 flex hover:bg-gray-600 items-center cursor-pointer", {
        "bg-gray-700": isActive,
        "bg-gray-900": !isActive,
      })}
    >
      <div className="flex items-center justify-between flex-1 overflow-hidden leading-tight">
        <div className="relative flex items-center justify-center w-8 h-8">
          <button
            className="absolute top-0 left-0 w-full h-full transition-opacity ease-in-out opacity-25 hover:opacity-100"
            onClick={() => onPlayPauseTrack()}
          >
            {isPlaying ? <Pause /> : <Play />}
          </button>
        </div>
        <div className="flex flex-col w-3/5 pr-4">
          <h6 className="font-medium truncate text-sm ...">{title}</h6>
          <span className="text-xs text-gray-400 truncate ...">{artist}</span>
        </div>
        <div className="w-1/5 text-right">
          <span className="text-xs text-gray-400 truncate leading-tight ...">{version}</span>
        </div>
      </div>
      {loadingRemove ? (
        <Loader />
      ) : (
        <button className="absolute top-0 right-0" onClick={remove}>
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
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default ChartListEntry;
