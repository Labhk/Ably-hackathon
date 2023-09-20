import React, { useEffect, useState } from 'react';
import { useChannel } from "./AblyReactEffect.js";
import styles from '../styles/AblyChatComponent.module.css';
import { Editor } from '@tinymce/tinymce-react';
import parse from 'html-react-parser';

const AblyChatComponent = () => {
  let messageEnd = null;

  const [messageText, setMessageText] = useState("");
  const [receivedMessages, setMessages] = useState([]);
  const [value, setValue] = useState("");
  const [channelName, setChannelName] = useState("home");
  const [channels, setChannels] = useState(["home"]);

  const [channel, ably] = useChannel(`${channelName}`, (message) => {
    setMessages((receivedMessages)=>[...receivedMessages, message]);
  });

  const form = document.querySelector('form#chat-form');
  const input = document.querySelector('input#create-channel');

  const sendChatMessage = (messageText) => {
    channel.publish({ 
      name: channelName, data: `<strong>${messageText.slice(3, -4) + '</strong> <em>at</em> ' + '<em>'+ new Date().toLocaleString().split(',')[1]}</em>` 
    });
  }
  
  const handleFormSubmission = (event) => {
    event.preventDefault();
    if (messageText === '') {
      alert("Please enter a message")
    } else { 
      sendChatMessage(messageText);
      form.reset();
    }
  }

  const messages = receivedMessages.map((message, index) => {
    const author = message.connectionId === ably.connection.id ? "Me" : "Ghost";
    let parsedMessage;
    try {
      parsedMessage = parse(message.data);
    } catch (error) {
      console.log(error);
      parsedMessage = message.data;
    }
    return (
    <span key={index} className={styles.messages}>
      <span className={styles.author}>{author}:&nbsp;</span>
      <span className={styles.message} data-author={author}>{parsedMessage}</span>
    </span>
    )
  });

  const createChannel = () => {
    if (value === '') {
      alert("Please enter a channel name")
    } else if (channels.includes(value)) {
      alert("This channel already exists")
      setValue("");
    } else {
      setChannelName(value);
      const newChannel = ably.channels.get(`[?rewind=2m&rewindLimit=10]${value}`);
      newChannel.attach();
      newChannel.publish({ 
        name: value, data: `A New Channel named <strong>"${value}"</strong> was created <em> at ${new Date().toLocaleString().split(',')[1]}</em>` 
      });
      newChannel.once("attached", () => {
        newChannel.history((err, page) => {
          const messages = page.items.reverse();
          setMessages([...messages]);
          setChannels((channels)=>[...channels, value]);
        });
        setValue("");
      });
    }
  }

  const switchChannel = (e) => {
    e.preventDefault();
    const newChannelName = e.target.innerText;
    setChannelName(newChannelName);
    if (newChannelName === channelName) {
      alert("You are already in this channel")
      return;
    } else {
    const newChannel = ably.channels.get(`[?rewind=2m&rewindLimit=10]${newChannelName}`);
    newChannel.attach();
    newChannel.publish({ name: newChannelName, data: `Switched to channel: <strong>"${newChannelName}"</strong>` });
      newChannel.history((err, page) => {
        let messages = page.items.reverse();
        setMessages([...messages]);
      });
  }
}

  useEffect(() => {
    messageEnd.scrollIntoView({ behaviour: "smooth" });
  });

  return (
    <>
      <h1 className={styles.channels}>
      <span className={styles.channelTitle}>Channels</span>
      {channels.map((channel, index) => 
      <p className={styles.channelListItems} key={index} onClick={(e) =>switchChannel(e)}>
        {channel}
      </p>
      )}
      </h1>
    <center>
      <h1>"{channelName}"</h1>
      <div className={styles.createChannel}>
        <input 
        id="create-channel" 
        type="text" 
        placeholder="Enter Channel Name"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        />
        <button onClick={createChannel}>Create New Channel</button>
      </div>
      <div className={styles.chatHolder}>
        <div className={styles.chatText}>
          {messages}
          <div ref={(element) => { messageEnd = element; }}></div> 
        </div>
        <form
        id="chat-form" 
        onSubmit={handleFormSubmission} 
        className={styles.form}
        >
          <Editor
            apiKey={process.env.TINY_MCE_API_KEY}
            onKeyDown={(e) => {
              if (e.key == "Enter") {
                e.preventDefault();
                sendChatMessage(messageText);
                form.reset();
              }
            }}
            init={{
              height: 180,
              placeholder: "Type your message here...",
              menubar: false,
              plugins: [
                'emoticons',
                'insertdatetime',
                'link',
                'lists',
                'table',
                'image',
                'code'
              ],
              toolbar:
                'undo redo | formatselect | bold italic backcolor | \
                link | code | emoticons | removeformat \ '
            }}
            onEditorChange={(content, editor) => setMessageText(content)}
          />
          <button type="submit" className={styles.button}>Send</button>
        </form>
      </div>
    </center>
    </>
  )
}

export default AblyChatComponent;