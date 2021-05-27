import { selectPeers, useHMSStore } from "@100mslive/hms-video-react";
import React, { useContext } from "react";
import { AppContext } from "../store/AppContext";
import { ROLES } from "../common/roles";
import { GridCenterView, GridSidePaneView } from "./components/gridView";

export const StudentGridView = ({ isChatOpen, toggleChat }) => {
  const { maxTileCount } = useContext(AppContext);
  const peers = useHMSStore(selectPeers);
  const teacherPeers = peers.filter((peer) => peer.role === ROLES.TEACHER);
  const studentPeers = peers.filter((peer) => peer.role === ROLES.STUDENT);
  const hideSidePane = (teacherPeers.length > 1 && studentPeers.length == 0) || (teacherPeers.length == 0 && studentPeers.length > 1)
  console.log(teacherPeers, studentPeers, hideSidePane)
  return (
    <React.Fragment>
      <GridCenterView
        peers={hideSidePane ? peers : teacherPeers}
        maxTileCount={maxTileCount}
        allowRemoteMute={false}
      ></GridCenterView>
      {!hideSidePane && <GridSidePaneView
        peers={studentPeers}
        isChatOpen={isChatOpen}
        toggleChat={toggleChat}
      ></GridSidePaneView>
      }
    </React.Fragment>
  );
};
