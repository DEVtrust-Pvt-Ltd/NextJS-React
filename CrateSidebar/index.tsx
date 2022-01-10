import React from "react";
import { useQuery } from "@apollo/client";
import ReactTooltip from "react-tooltip";
import { GET_CRATE_SONGS } from "./Query";
import { GetCrateSongs } from "types/generated/GetCrateSongs";
import Loader from "../Loader";

import useCrateAPI from "useApi/useCrateAPI";
import { useToast } from "../DubToast/useToast";
import { useAppContext } from "@/contexts/app/app.context";
import ActionTypes from "@/contexts/app/actionTypes";
import useMusicPlayer from "@/hooks/useMusicPlayer";
import ChartListEntry from "./ChartListEntry";
import ClearCrate from "./ClearCrate";

const CrateSidebar: React.FC<{
  onClose: () => void;
}> = (props) => {
  const { onClose } = props;
  const { error, loading, data } = useQuery<GetCrateSongs>(GET_CRATE_SONGS);
  const { playerStatus, currentSongId, initiatePlayback, pausePlayback, resumePlayback } = useMusicPlayer();
  const [, appDispatch] = useAppContext();
  const { showToast } = useToast();
  const { loading: loadingDownload, download } = useCrateAPI();

  const onPlayPauseTrack = (trackIndex: number, songId: string) => {
    if (playerStatus.kind === "PLAYING" && currentSongId === songId) pausePlayback();
    else if (playerStatus.kind === "PAUSED" && currentSongId === songId) resumePlayback();
    else {
      // initiate playback
      console.log("Initiating playback");
      initiatePlayback(
        trackIndex,
        songId,
        data.crate[0].crate_songs.map((el) => {
          return {
            id: el.song.song_id,
            mix: el.song.release.mix,
            artist: el.song.release.artist,
            name: el.song.release.title,
            versions: [
              {
                song_id: el.song.song_id,
                uri: el.song.uri,
                version: el.song.version,
              },
            ],
          };
        })
      );
    }
  };

  const onDownloadBtnClick = () => {
    download()
      .then(() => {
        appDispatch({
          type: ActionTypes.SET_APP_STATE_VALUE,
          payload: { shouldAcceptZipDownload: true },
        });
        showToast("Download requested", "Requested crate download successfully");
      })
      .catch((err) => console.log(err));
  };

  return (
    <section className="relative flex flex-col justify-between flex-1 h-full overflow-hidden w-72 md:w-80 focus:outline-none dark:bg-black">
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between mx-2 my-4 mb-2">
          <h3 className="inline-block w-auto text-2xl page-title font-outline">My Crate</h3>
          {loading ? (
            <div className="flex items-center justify-center">
              <Loader />
            </div>
          ) : (
            <div>
              {data.crate[0].crate_songs.length > 0 && (
                <>
                  <button data-tip data-for="zipdl" className="relative mx-1">
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
                        d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                      />
                    </svg>
                  </button>
                  <ReactTooltip id="zipdl" type="dark">
                    <span>Download Crate</span>
                  </ReactTooltip>
                  <ClearCrate crateId={data.crate[0].crate_id} />
                </>
              )}
              <button data-tip data-for="closecrate" className="relative mx-1" onClick={onClose}>
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
              <ReactTooltip id="closecrate" type="dark">
                <span>Close Crate</span>
              </ReactTooltip>
            </div>
          )}
        </div>
        <div className="flex-1 w-full px-2 overflow-auto pb-36">
          {loading ? (
            <div className="flex items-center justify-center w-full h-screen p-8">
              <Loader />
            </div>
          ) : error ? (
            <p>{error.message}</p>
          ) : (
            data.crate[0].crate_songs.map((el, idx) => {
              return (
                <ChartListEntry
                  key={el.song.song_id}
                  crateId={data.crate[0].crate_id}
                  songId={el.song.song_id}
                  title={el.song.release.title}
                  artist={el.song.release.artist}
                  version={el.song.version}
                  isActive={currentSongId === el.song.song_id}
                  isPlaying={currentSongId === el.song.song_id}
                  onPlayPauseTrack={() => onPlayPauseTrack(idx, el.song.song_id)}
                />
              );
            })
          )}
        </div>
      </div>
      {!data?.crate[0]?.uri ? (
        <button className="absolute w-full p-3 font-bold bg-gray-400 bottom-20" onClick={onDownloadBtnClick}>
          {loadingDownload ? <Loader /> : "Download All"}
        </button>
      ) : (
        <a
          href={`https://dubseek-crate-container.s3.us-east-2.amazonaws.com/${data.crate[0].uri}`}
          download="My Crate.zip"
        >
          <button className="absolute w-full p-3 font-bold text-gray-900 bg-green-400 bottom-20">Download</button>
        </a>
      )}
    </section>
  );
};

export default CrateSidebar;
