var Actions = require('../actions/SocketConnectionActions');
var ParticipantsActions = require('../actions/ParticipantsActions');
var TicketsActions = require('../actions/TicketsActions');
var RoomActions = require('../actions/RoomActions');
var SessionActions = require('../actions/SessionActions');
var SessionStore = require('../stores/SessionStore');

var SocketConnection = Reflux.createStore({
  listenables: [Actions],

  init() {
    this.socket = new Socket("ws://localhost:4000/ws");
    this.channel = {};
    this.error = {};

    this.listenTo(SessionStore, this.setSocketSession);
  },

  getInitialState() {
    return this.returnData();
  },

  returnData() {
    return {
      socket: this.socket,
      channel: this.channel,
      error: this.error
    };
  },

  emitData() {
    this.trigger(this.returnData());
  },

  onEstablishConnection(roomUUID, session) {
    this.session = session;
    this.socket.connect();
    this.socket.onClose(e => console.log("CLOSE", e));
    this.emitData();
    this.joinChannel(roomUUID);
  },

  joinChannel(roomUUID) {
    if(this.session.uuid) {
      var channel = this.socket.chan(`planning:room:${roomUUID}`, { uuid: this.session.uuid });
    }
    else {
      var channel = this.socket.chan(`planning:room:${roomUUID}`);
    }
    this.channel = channel;
    this.mapChannelCallbacks();

    channel.join()
      .receive("ignore", () => console.log("auth error"))
      .receive("ok", () => console.log("join ok"));
    this.emitData();
  },

  mapChannelCallbacks() {
    this.channel.on("sync", (message) => this.sync(message));
    this.channel.on("session", (message) => this.setSession(message));
  },

  setSession(message) {
    SessionActions.setSession({ uuid: message.participant.uuid, id: message.participant.id });
  },

  setSocketSession(sessionStorage) {
    this.session = sessionStorage.session;
  },

  sync(message) {
    RoomActions.setRoom(message.room);
    ParticipantsActions.setParticipants(message.room.participants);
    TicketsActions.setTickets(message.room.tickets);
  },

  onCreateTicket(ticket) {
    this.channel.push("create_ticket", { ticket: ticket, userUUID: this.session.uuid });
  },

  onDeleteTicket(ticket) {
    this.channel.push("delete_ticket", { ticket: ticket, userUUID: this.session.uuid });
  },

  onUpdateTicket(ticket) {
    this.channel.push("update_ticket", { ticket: ticket, userUUID: this.session.uuid });
  }
});

module.exports = SocketConnection;