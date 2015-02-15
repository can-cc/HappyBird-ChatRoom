/**
 * Created by tyan on 15-2-12.
 */
var TEMP = (function () {
    temp = {};

    temp.message =  '<div class="chat_content_group buddy" >' +
                    '<img class="chat_content_avatar" alt="pic" height="40px" width="40px"> ' +
                    '<p class="chat_nick"></p> ' +
                    '<p class="chat_content "></p> ' +
                    '</div>';

    temp.message_self = '<div class="chat_content_group self"> ' +
                        '<img class="chat_content_avatar"  height="40px" width="40px"> ' +
                        '<p class="chat_nick"></p>' +
                        '<p class="chat_content "></p>' +
                        '</div>';

    temp.sys_message = '<span class="info label"></span>';

    return temp;
}());
