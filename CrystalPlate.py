#!/usr/bin/python

#required libraries
import sys                                 
import ssl
import paho.mqtt.client as mqtt
import json
from pprint import pprint
import Adafruit_CharLCD as LCD
from textwrap import fill

#Configuration
rootCAPath = "certs/rootCA.pem"
certFilePath = "certs/63fee16d41-certificate.pem.crt"
keyFilePath = "certs/63fee16d41-private.pem.key"
iotThing = "Zorua"
clientID = "Zorua"

#Device JSON initialization
device = {'state': {'reported': {'HP':100} } }
device['state']['reported']['color'] = {'r':0, 'g':0, 'b':0}

#Create LCD
lcd = LCD.Adafruit_CharLCDPlate()

#LCD wrapper
def set_lcd_color(R,G,B):
    global lcd
    device['state']['reported']['color']['r'] = R
    device['state']['reported']['color']['g'] = G
    device['state']['reported']['color']['b'] = B
    lcd.set_color(R, G, B)
def set_lcd_message(message):
    global lcd
    device['state']['reported']['msg'] = message
    lcd.clear()
    #Word wrap to fit 16-char wide display and add capitalization
    lcd_message = fill(message.capitalize(),16)
    lcd.message(lcd_message)
    
# Initialize the LCD using the pins
set_lcd_message('Initializing...')
set_lcd_color(0, 0, 1)

#called while client tries to establish connection with the server 
def on_connect(mqttc, obj, flags, rc):
    print "Connecting..."
    if rc==0:
        print ("Subscriber Connection status code: "+str(rc)+" | Connection status: successful")
        #We only want to be notified about things we need to change to stay in sync with AWS
        mqttc.subscribe("$aws/things/" + iotThing + "/shadow/update/delta", qos=1)
    elif rc==1:
        print ("Subscriber Connection status code: "+str(rc)+" | Connection status: Connection refused")
        print ("Subscriber Connection status code: "+str(rc))

#called when a topic is successfully subscribed to
def on_subscribe(mqttc, obj, mid, granted_qos):
    print("Subscribed: "+str(mid)+" "+str(granted_qos)+"data"+str(obj))
    set_lcd_color(0,1,0)
    set_lcd_message('Connected!\nReady for input')
    #Let AWS know about the current state of the plate so we can tell us what's out of sync
    mqttc.publish("$aws/things/" + iotThing + "/shadow/update", json.dumps(device))

#called when a message is received by a topic
#Messages are formatted in JSON
#When working with /update, we might not find all keys all the time, so we need to handle that
def on_message(mqttc, obj, msg):
    try:
        data = json.loads(msg.payload)
        update = data['state']
    except:
        return
    #Look for a message in the update. If it's there, we need to update the display
    if 'msg' in update.keys():
        try:
            set_lcd_message(update['msg'])
        except:
            print("Could not enact message from topic: "+msg.topic+" | QoS: "+str(msg.qos)+" | Data Received: "+str(msg.payload))
    #Look to see if the status of R, G, or B has changed for the display
    if 'color' in update.keys():
        try: lcd_r = update['color']['r']
        except: lcd_r = device['state']['reported']['color']['r']
        try: lcd_g = update['color']['g']
        except: lcd_g = device['state']['reported']['color']['g']
        try: lcd_b = update['color']['b']
        except: lcd_b = device['state']['reported']['color']['b']
        set_lcd_color(lcd_r,
                      lcd_g,
                      lcd_b)
    #Let AWS know we've updated the display
    mqttc.publish("$aws/things/Zorua/shadow/update", json.dumps(device))
        
#creating a client with client-id=Zorua
mqttc = mqtt.Client(client_id=clientID)

mqttc.on_connect = on_connect
mqttc.on_reconnect = on_connect
mqttc.on_subscribe = on_subscribe
mqttc.on_message = on_message

#Configure network encryption and authentication options. Enables SSL/TLS support.
#adding client-side certificates and enabling tlsv1.2 support as required by aws-iot service
mqttc.tls_set(rootCAPath,
	            certfile=certFilePath,
	            keyfile=keyFilePath,
              tls_version=ssl.PROTOCOL_TLSv1_2, 
              ciphers=None)

#connecting to aws-account-specific-iot-endpoint
print ("About to connect")
mqttc.connect("a3d6deevbofb2k.iot.us-east-1.amazonaws.com", port=8883) #AWS IoT service hostname and portno

#automatically handles reconnecting
mqttc.loop_forever()

