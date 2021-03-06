import { useState, useEffect, useRef } from "react";
import useEvaluate from "./useEvaluate";
// import useSocket from "./hooks/useSocket";

import { setHand, shuffle, computerPlayer } from "../helpers/helpers";
import { turnEvaluate, gameEvaluate } from "../helpers/evaluate";
import { deck } from "../data/deck";

import socketIOClient from "socket.io-client";
const client = socketIOClient(process.env.REACT_APP_ENDPOINT);

export default function useGame() {
  const [pickA, setPickA] = useState(null); // pick index of hand
  const [pickB, setPickB] = useState(null);
  const [deckA, setDeckA] = useState(shuffle(deck, 4));
  const [deckB, setDeckB] = useState(shuffle(deck, 4));
  const [turnResult, setTurnResult] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [room, setRoom] = useState("");
  const [roomListener, setRoomListener] = useState("");
  const [requestRoom, setRequestRoom] = useState(false);
  const [leaveRoom, setLeaveRoom] = useState(false);
  const [resetGame, setResetGame] = useState(false);
  const [hasOpponent, setHasOpponent] = useState(false);
  const { yourScore, theirScore, complexEval, resetScore } = useEvaluate();

  useEffect(() => {
    // listeners
    client.on("initDeck", data => {
      // init deck from set table config
      setDeckA(data.deckB);
      setDeckB(data.deckA);
    }); // the game is dumb now; it just init decks and not update

    client.on("theirPick", data => {
      // listens for opponent picks
      setPickB(data);
    });

    client.on("message", data => {
      // listens for socket-related messages from server
      alert(data);
    });

    client.on("opponentStatus", data => {
      // listen for opponent presence; data is roomsize
      console.log('status:', data);
      setHasOpponent(data > 1 ? true : false);

      if (data > 1) {
        // if opponent is joining;
        setPickB(null);
        resetScore();
      }
    });

    client.on("publicRoomName", data => {
      setRoom(data);
      // should check if someone else is playing; if not computer picks
    });

  // eslint-disable-next-line
  }, []);

  const didMount = useRef(false);
  useEffect(() => {
    if (didMount.current) {
      // skip first render
      if (hasOpponent) {
        // conditional for when another player is in a room
        client.emit("myPick", pickA);
      } else {
        setPickB(computerPlayer(handB));
      }
    } else {
      didMount.current = true;
    }
  // eslint-disable-next-line
  }, [pickA]);

  useEffect(() => {
    if (requestRoom) {
      if (room) {
        client.emit("joinRoom", room);
        client.emit("initDeck", {deckA, deckB});
      } else {
        client.emit("publicRoom");
        client.emit("initDeck", {deckA, deckB});
      }
      setRequestRoom(false);
    }
  // eslint-disable-next-line
  }, [requestRoom]);

  useEffect(() => {
    if (resetGame) {
      setPickA(null);
      setPickB(null);
      resetScore();

      const newDeckA = shuffle(deck, 4);
      const newDeckB = shuffle(deck, 4);
      setDeckA(newDeckA);
      setDeckB(newDeckB);
      client.emit("initDeck", {deckA: newDeckA, deckB: newDeckB});
      setResetGame(false);
    }
    // eslint-disable-next-line
  }, [resetGame]);

  useEffect(() => {
    const cycleCards = () => {
      setDeckA((prev) => {
        const newArr = [...prev];
        newArr.splice(pickA, 1);
        return newArr;
      });
      setDeckB((prev) => {
        const newArr = [...prev];
        newArr.splice(pickB, 1);
        return newArr;
      });
    };

    if (pickA !== null && pickB !== null) {
    // if (Number.isInteger(pickA) && Number.isInteger(pickB)) {
      setTurnResult(turnEvaluate(handA[pickA], handB[pickB]));
      complexEval(handA[pickA], handB[pickB]);
      setPickA(null);
      setPickB(null);
      cycleCards();
    }

    if (!deckA.length && !deckB.length) {
      setGameResult(gameEvaluate(yourScore, theirScore));
    }
  // eslint-disable-next-line
  }, [pickA, pickB]);

  useEffect(() => {
    client.emit("leaveRoom");
    setLeaveRoom(false);
  }, [leaveRoom]);

  const handA = setHand(deckA);
  const handB = setHand(deckB);

  const roomChangeListener = value => {
    // takes element value to setRoom
    // setRoom(value);
    setRoomListener(value);
  }

  const requestJoinRoom = () => {
    // triggers useEffect with requestRoom dependency
    setRequestRoom(true);
    setRoom(roomListener);
  }

  const requestLeaveRoom = () => {
    // triggers useEffect with leaveRoom dependency
    setLeaveRoom(true);
    setRoom("");
  }

  const startNewGame = () => {
    // triggers useEffect with resetGame dependency
    setResetGame(true);
  }

  return {
    setPickA,
    setTurnResult,
    setGameResult,
    startNewGame,
    roomChangeListener,
    requestJoinRoom,
    requestLeaveRoom,
    handA,
    handB,
    deckA,
    deckB,
    pickA,
    turnResult,
    gameResult,
    yourScore,
    theirScore,
    room,
    roomListener,
    hasOpponent
  };
};