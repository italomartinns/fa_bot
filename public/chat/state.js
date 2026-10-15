const composer = document.getElementById("composer");
const input = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const logoutBtn = document.getElementById("logoutBtn");
const currentUserName = document.getElementById("currentUserName");
const newChatBtn = document.querySelector(".new-chat-btn");
const conversationList = document.getElementById("conversationList");
const menuBtn = document.getElementById("menuBtn");
const closeSidebarBtn = document.getElementById("closeSidebarBtn");
const sidebarPanel = document.getElementById("sidebarPanel");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");

const USERS_KEY = "fa_users";
const CURRENT_USER_KEY = "fa_current_user";

let conversations = [];
let currentConversationId = null;
