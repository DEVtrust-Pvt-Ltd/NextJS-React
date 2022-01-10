import MusicPlayerContextActionTypes from "@/contexts/music/actionTypes";
import { useMusicPlayerContext } from "@/contexts/music/music.context";
import { useApolloClient, useLazyQuery } from "@apollo/client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Transition } from "@headlessui/react";
import { GetMusicPCM, GetMusicPCMVariables } from "types/generated/GetMusicPCM";
import { throttle } from "utils";
import WaveSurfer from "wavesurfer.js";
import CursorPlugin from "wavesurfer.js/dist/plugin/wavesurfer.cursor";
import ReactTooltip from "react-tooltip";
import Loader from "../Loader";
import Play from "../Icons/play";
import Pause from "../Icons/pause";
import QueueOpen from "../Icons/queue.open";
import QueueClose from "../Icons/queue.close";
import { playerConfig } from "./config";
import { GET_MUSIC_PCM } from "./Query";
import QueuePopup from "../QueuePopup";

import cx from "classnames";
import styles from "./styles.module.css";
import useMusicPlayer from "@/hooks/useMusicPlayer";
import useSongsAPI from "useApi/useSongsAPI";
import { useAppContext } from "@/contexts/app/app.context";
import { GET_USER_INFO } from "../ProfileDropdown/Query";
import { GetUserInfo } from "types/generated/GetUserInfo";

const SPACEBAR_KEY_CODE = 32;
const LEFT_ARROW_KEY_CODE = 37;
const RIGHT_ARROW_KEY_CODE = 39;
// const UP_ARROW_KEY_CODE = 38;
// const DOWN_ARROW_KEY_CODE = 40;

const MusicPlayer: React.FC = () => {
  const [
    { elapsedDuration, trackDuration, status, currentSongId, queue, queueIndex },
    dispatch,
  ] = useMusicPlayerContext();
  const [appState] = useAppContext();
  const client = useApolloClient();
  const [isQueuePopupOpen, setIsQueuePopupOpen] = useState(false);
  const { download } = useSongsAPI(appState.apiKey);

  const wavesurfer = useRef<WaveSurfer>();
  const waveSurferContainerRef = useRef<HTMLDivElement>();
  const popupContainerRef = useRef<HTMLDivElement>();
  const { playNextTrack, playPreviousTrack } = useMusicPlayer();

  const [fetchPCM, { loading, data, error }] = useLazyQuery<GetMusicPCM, GetMusicPCMVariables>(GET_MUSIC_PCM);

  const linGrad = document.createElement("canvas").getContext("2d").createLinearGradient(0, 0, 1000, 128);
  linGrad.addColorStop(0, "#64e79f");
  linGrad.addColorStop(1, "#94a9ff");

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!popupContainerRef?.current?.contains(event.target as Node)) {
        if (isQueuePopupOpen) setIsQueuePopupOpen(false);
      }
    };

    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [isQueuePopupOpen, popupContainerRef]);

  useEffect(() => {
    wavesurfer.current = WaveSurfer.create({
      ...playerConfig,
      progressColor: (linGrad as unknown) as string,
      plugins: [
        CursorPlugin.create({
          width: "1px",
          color: "red",
          opacity: "1",
        }),
      ],
    });

    wavesurfer.current.on("play", function () {
      dispatch({
        type: MusicPlayerContextActionTypes.SET_MUSIC_PLAYER_STATE_VALUE,
        payload: {
          status: {
            kind: "PLAYING",
            context: { isLoading: false },
          },
        },
      });
    });

    wavesurfer.current.on("pause", function () {
      dispatch({
        type: MusicPlayerContextActionTypes.SET_MUSIC_PLAYER_STATE_VALUE,
        payload: {
          status: {
            kind: "PAUSED",
            context: { isLoading: false },
          },
        },
      });
    });

    wavesurfer.current.on("finish", function () {
      dispatch({
        type: MusicPlayerContextActionTypes.PLAY_PREVIOUS_SONG,
        payload: null,
      });
    });

    const onProgress = (time: number) => {
      dispatch({
        type: MusicPlayerContextActionTypes.SET_MUSIC_PLAYER_STATE_VALUE,
        payload: {
          elapsedDuration: time,
        },
        disableLogging: true,
      });
    };

    wavesurfer.current.on("audioprocess", throttle(onProgress, 350));

    return () => {
      wavesurfer.current.unAll();
      wavesurfer.current.destroy();
    };
  }, []);

  // handle keyboard input
  useEffect(() => {
    const onKeyPress = (e: KeyboardEvent) => {
      if (e.defaultPrevented) {
        return;
      }
      const key = e.key || e.keyCode;
      if (key === " " || key === SPACEBAR_KEY_CODE) {
        playPause();
      }
      if (key === "ArrowRight" || key === RIGHT_ARROW_KEY_CODE) {
        wavesurfer.current.skipForward(10);
      }
      if (key === "ArrowLeft" || key === LEFT_ARROW_KEY_CODE) {
        wavesurfer.current.skipBackward(10);
      }
    };
    waveSurferContainerRef.current.addEventListener("keydown", onKeyPress);
    return () => {
      waveSurferContainerRef.current?.removeEventListener("keydown", onKeyPress);
    };
  }, [waveSurferContainerRef.current]);

  useEffect(() => {
    const onSeek = (time: number) => {
      if (elapsedDuration !== time && trackDuration && !(status.kind === "PLAYING")) {
        dispatch({
          type: MusicPlayerContextActionTypes.SET_MUSIC_PLAYER_STATE_VALUE,
          payload: {
            elapsedDuration: time * trackDuration,
          },
        });
      }
    };
    wavesurfer.current.on("seek", onSeek);
    return () => {
      wavesurfer.current.un("seek", onSeek);
    };
  }, [trackDuration]);

  useEffect(() => {
    const onReady = () => {
      wavesurfer.current.play().then(() => {
        dispatch({
          type: MusicPlayerContextActionTypes.SET_MUSIC_PLAYER_STATE_VALUE,
          payload: {
            status: {
              kind: "PLAYING",
              context: { isLoading: false },
            },
            elapsedDuration: 0,
            trackDuration: wavesurfer.current.getDuration(),
          },
        });
      });
    };
    wavesurfer.current.on("ready", onReady);
    return () => {
      wavesurfer.current.un("ready", onReady);
    };
  }, [wavesurfer.current, currentSongId]);

  React.useEffect(() => {
    if (queueIndex !== null && queueIndex > -1) {
      const release = queue[queueIndex];
      dispatch({
        type: MusicPlayerContextActionTypes.SET_MUSIC_PLAYER_STATE_VALUE,
        payload: {
          status: {
            kind: "LOADING",
            context: { isLoading: true },
          },
          elapsedDuration: 0,
          trackDuration: 0,
        },
      });
      fetchPCM({
        variables: {
          id: release.versions[0].song_id,
        },
      });
    }
  }, [queueIndex]);

  // handle GraphQL responses
  useEffect(() => {
    if (wavesurfer.current) {
      if (wavesurfer.current.isPlaying()) wavesurfer.current.stop();
      if (data && !loading && data.song_by_pk) {
        wavesurfer.current.load(
          `${process.env.NEXT_PUBLIC_MEDIA_CLOUDFRONT_URL}/${data.song_by_pk.uri}`,
          JSON.parse(data.song_by_pk.pcm_data) as readonly number[]
        );
        dispatch({
          type: MusicPlayerContextActionTypes.SET_MUSIC_PLAYER_STATE_VALUE,
          payload: {
            status: {
              kind: "PLAYING",
              context: { isLoading: false },
            },
          },
        });
      }
    }
  }, [data, loading, error]);

  const playPause = () => {
    if (wavesurfer.current) {
      wavesurfer.current.isPlaying() ? wavesurfer.current.pause() : wavesurfer.current.play();
    }
  };

  const formatTime = useCallback(
    (time: number) => {
      return [
        Math.floor((time % 3600) / 60), // minutes
        ("00" + Math.floor(time % 60)).slice(-2), // seconds
      ].join(":");
    },
    [elapsedDuration, trackDuration]
  );

  const release = queue[queueIndex] || null;

  return (
    <React.Fragment>
      <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center h-20 px-4 border-t border-gray-900 shadow-xl bg-gray-950">
        <div ref={waveSurferContainerRef} className="flex items-center w-full h-full focus:outline-none" tabIndex={0}>
          <div className="flex items-center justify-center order-2 w-24 h-full sm:order-1">
            <button className="px-2 text-gray-400 tempPrev" onClick={() => playPreviousTrack()}>
              ‹
            </button>
            {status.context.isLoading ? (
              <Loader />
            ) : (
              <button className={styles.playpause} onClick={playPause}>
                {status.kind === "PLAYING" ? <Pause /> : <Play />}
              </button>
            )}
            <button className="px-2 text-gray-400 tempNext" onClick={() => playNextTrack()}>
              ›
            </button>
          </div>
          <div className="flex order-3 w-64 px-2 pr-6 overflow-hidden md:w-96 sm:order-2">
            <div className="flex flex-col w-3/4">
              <span className={cx(["..."], styles.artist)}>{release?.artist ?? "Artist"}</span>
              <span className={cx(["..."], styles.title)}>
                <span>{release?.name ?? "Title"}</span>
                <span className={cx(["..."], styles.mix)}>{release?.mix ?? "Mix"}</span>
              </span>
            </div>
            <div className="flex items-center justify-end w-1/4 text-right">
              <select className="text-gray-300 rounded-xl p-2 pr-8 bg-gray-800 border-none text-sm">
                {release?.versions?.map((version) => (
                  <option key={version.uri} value={version.uri} disabled={false}>
                    {version.version}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="relative flex items-center order-3 w-1/2 h-2 lg:w-3/5 sm:order-3">
            <div id="draw" className="relative flex-1" />
            <div className="justify-center hidden w-24 text-xs text-gray-300 lg:flex">
              {formatTime(elapsedDuration)} / {formatTime(trackDuration)}
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.crate} data-tip data-for="saveToCrate">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
              <svg
                className="hidden w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
              </svg>
            </button>
            <ReactTooltip id="saveToCrate" type="dark">
              <span>Add to Crate</span>
            </ReactTooltip>

            <button
              className={styles.download}
              data-tip
              data-for="downloads"
              onClick={() => {
                download(currentSongId).then(() => {
                  // update quota
                  const existingData = client.readQuery<GetUserInfo>({ query: GET_USER_INFO });
                  if (!existingData) return;
                  client.writeQuery<GetUserInfo>({
                    query: GET_USER_INFO,
                    data: {
                      user: [
                        {
                          ...existingData.user[0],
                          apiKey: {
                            ...existingData.user[0].apiKey,
                            remaining_quota: existingData.user[0].apiKey.remaining_quota - 1,
                          },
                        },
                      ],
                    },
                  });
                });
              }}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <svg
                className="hidden w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <ReactTooltip id="downloads" type="dark">
              <span>Download</span>
            </ReactTooltip>
            <button
              className={cx(
                "flex justify-center w-4 h-4 items-center transition-colors focus:outline-none duration-500 hover:text-primary",
                {
                  "bg-black": !isQueuePopupOpen,
                  "bg-transparent text-primary": isQueuePopupOpen,
                }
              )}
              onClick={() => setIsQueuePopupOpen((s) => !s)}
              data-tip
              data-for="queue"
            >
              {isQueuePopupOpen ? <QueueClose /> : <QueueOpen />}
            </button>
            <ReactTooltip id="queue" type="dark">
              <span>Toggle Queue</span>
            </ReactTooltip>
          </div>
        </div>
      </div>
      {/* Queue sidebar */}
      <Transition show={isQueuePopupOpen} className="flex transition md:flex-shrink-0">
        <QueuePopup ref={popupContainerRef} />
      </Transition>
    </React.Fragment>
  );
};

export default MusicPlayer;
