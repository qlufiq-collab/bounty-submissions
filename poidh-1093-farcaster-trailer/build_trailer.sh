#!/bin/sh
# "FARCASTER" fan-made concept trailer (poidh base/1093): 10 Google Flow stills (images/001..010.jpg) animated with
# slow push-ins, crossfades, trailer title cards and Mixkit SFX (free licence) over a synthesized low drone.
# Usage: sh build_trailer.sh -> out/farcaster_trailer.mp4 (1920x1080, ~66 s) + out/thumb.png
#        VID=videos_local TAG=_local sh build_trailer.sh -> same trailer from another clip folder, out/farcaster_trailer_local.mp4
set -e
cd "$(dirname "$0")"
mkdir -p out tmp
W=1920; H=1080; fps=30; D=7; X=0.8
FL=Inter-Display-Light; FB=Inter-Display-ExtraBold
SFX=${SFX:-./sfx/mixkit}   # Mixkit free sound effects (mixkit.co), cinematic/ category
VID=${VID:-videos}; TAG=${TAG:-}
# GPU encode: NVENC everywhere, intermediate clips constqp 20 / no B-frames /
# cavlc (cheap to decode again), final VBR cq 21 with AQ. CPU only scales/overlays/crossfades. No -hwaccel cuda per clip.
ENC_CLIP="-c:v h264_nvenc -preset p1 -rc constqp -qp 20 -bf 0 -coder cavlc"
ENC_FINAL="-c:v h264_nvenc -preset p6 -tune hq -rc vbr -cq 21 -b:v 6M -maxrate 10M -bufsize 20M -spatial-aq 1 -temporal-aq 1 -bf 3 -b_ref_mode middle -profile:v high"
JOBS=4   # parallel clip encodes (NVENC sessions)
calc() { awk "BEGIN{print $1}"; }

card() { # n text -> tmp/t<n>.png (transparent caption layer, lower third, letter-spaced)
  magick -size ${W}x${H} xc:none "PNG32:tmp/t$1.png"
  if [ -n "$2" ]; then
    # soft dark band under the caption so it stays readable over bright frames (explosions, portal light)
    magick -size ${W}x320 gradient:none-'rgba(0,0,0,0.6)' "tmp/band.png"
    magick "tmp/t$1.png" "tmp/band.png" -gravity south -composite "PNG32:tmp/t$1.png"
    magick "tmp/t$1.png" -gravity south -font $FL -pointsize 46 -kerning 9 -fill 'rgba(0,0,0,0.85)' \
      -annotate +0+120 "$2" -blur 0x7 -fill white -annotate +0+120 "$2" "PNG32:tmp/t$1.png"
  fi
}
ORDER="001 002 003 004 006 005 008 007 009 010"
card 001 "IN A WEB OF A HUNDRED WORLDS"
card 002 "EVERY DOOR OPENED ONTO ANOTHER SKY"
card 003 "ONE STEP WAS ENOUGH"
card 004 ""
card 006 "THEY CALLED IT THE FARCASTER NETWORK"
card 005 "BUT SOMETHING WAITS AT THE EDGE OF TIME"
card 008 ""
card 007 "WHEN THE GATES FAIL"
card 009 "WHERE WILL YOU STEP NEXT?"
# title over the last scene
magick -size ${W}x${H} xc:none -gravity center \
  -fill 'rgba(0,0,0,0.55)' -draw "roundrectangle 360,380 1560,700 60,60" \
  -font $FB -pointsize 150 -kerning 38 -fill 'rgba(0,0,0,0.9)' -annotate +0-30 "FARCASTER" \
  -font $FL -pointsize 34 -kerning 8 -annotate +0+95 "INSPIRED BY HYPERION BY DAN SIMMONS" -blur 0x18 tmp/t010_shadow.png
magick tmp/t010_shadow.png -gravity center \
  -font $FB -pointsize 150 -kerning 38 -fill white -annotate +0-30 "FARCASTER" \
  -font $FL -pointsize 34 -kerning 8 -fill '#eef5f9' -annotate +0+95 "INSPIRED BY HYPERION BY DAN SIMMONS" PNG32:tmp/t010.png
# end card
magick -size ${W}x${H} xc:black -gravity center -font $FB -pointsize 110 -kerning 30 -fill white -annotate +0-60 "FARCASTER" \
  -font $FL -pointsize 32 -kerning 6 -fill '#9fb3bf' -annotate +0+50 "ONE STEP. ANY WORLD." \
  tmp/fend.png

i=0
for n in $ORDER; do
  magick "images/$n.jpg" -resize ${W}x${H}^ -gravity center -extent ${W}x${H} "tmp/f$n.png"
  if [ $((i % 2)) -eq 0 ]; then z="min(1+0.00045*on,1.09)"; else z="max(1.09-0.00045*on,1.0)"; fi
  fin=0.3; [ "$n" = "010" ] && fin=2.2
  if [ -f "$VID/$n.mp4" ]; then
    src="-ss 0.3 -t $D -i $VID/$n.mp4"
    bgf="[0]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=$fps,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=$D,trim=duration=$D[bg]"
  else
    src="-framerate $fps -loop 1 -t $D -i tmp/f$n.png"
    bgf="[0]scale=2112:1188,zoompan=z='$z':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=${W}x${H}:fps=$fps[bg]"
  fi
  ffmpeg -y -loglevel error -threads 2 $src -framerate $fps -loop 1 -t $D -i "tmp/t$n.png" -filter_threads 2 \
    -filter_complex "$bgf;\
[1]format=rgba,fade=t=in:st=$fin:d=0.9:alpha=1,fade=t=out:st=$(calc "$D-1.4"):d=0.8:alpha=1[cap];[bg][cap]overlay=0:0:shortest=1,format=yuv420p" \
    -an -r $fps $ENC_CLIP "tmp/c$n.mp4" &
  i=$((i+1))
  [ $((i % JOBS)) -eq 0 ] && wait
done
wait
# end card clip (keep the title layer of 010 from fading: end card is its own clip)
ffmpeg -y -loglevel error -framerate $fps -loop 1 -t 5 -i tmp/fend.png -vf "fade=t=in:st=0:d=0.6,format=yuv420p" -r $fps $ENC_CLIP tmp/cend.mp4

# crossfade chain
inputs=""; for n in $ORDER; do inputs="$inputs -i tmp/c$n.mp4"; done; inputs="$inputs -i tmp/cend.mp4"
fc=""; prev="[0]"; off=0; k=1
for n in $(echo $ORDER | cut -d' ' -f2-) end; do
  off=$(calc "$off+$D-$X"); tr=fade; [ "$n" = "007" ] && tr=fadewhite; [ "$n" = "end" ] && tr=fadeblack
  fc="$fc$prev[$k]xfade=transition=$tr:duration=$X:offset=$off[v$k];"; prev="[v$k]"; k=$((k+1))
done
TOTAL=$(calc "$off+5")
ffmpeg -y -loglevel error $inputs -filter_complex "${fc}${prev}format=yuv420p[v]" -map "[v]" $ENC_FINAL -r $fps tmp/video.mp4

# audio: low drone bed + trailer hits on the cards (times follow the crossfade offsets: scene k starts at (k-1)*(D-X))
S=$(calc "$D-$X")
t() { calc "($1-1)*$S*1000+$2"; }
ffmpeg -y -loglevel error \
 -f lavfi -i "aevalsrc='0.22*sin(2*PI*55*t)*(0.6+0.4*sin(2*PI*0.08*t))+0.12*sin(2*PI*82.4*t)+0.06*sin(2*PI*110*t)*(0.5+0.5*sin(2*PI*0.21*t))':s=44100:d=$TOTAL" \
 -i "$SFX/cinematic/1143_cinematic-whoosh-deep-impact.mp3" \
 -i "$SFX/cinematic/546_cinematic-mystery-trailer-drum-hit.mp3" \
 -i "$SFX/cinematic/546_cinematic-mystery-trailer-drum-hit.mp3" \
 -i "$SFX/cinematic/498_deep-heartbeat-impact.mp3" \
 -i "$SFX/cinematic/632_cinematic-drama-riser.mp3" \
 -i "$SFX/cinematic/1687_dramatic-metal-explosion-impact.mp3" \
 -i "$SFX/cinematic/790_cinematic-trailer-riser.mp3" \
 -i "$SFX/cinematic/2900_movie-logo-intro-impact.mp3" \
 -filter_complex "\
[0]volume=0.9,afade=t=in:d=2[d];\
[1]adelay=$(t 1 600)|$(t 1 600),volume=0.7[a1];[2]adelay=$(t 3 700)|$(t 3 700),volume=0.8[a2];[3]adelay=$(t 5 700)|$(t 5 700),volume=0.8[a3];\
[4]adelay=$(t 6 500)|$(t 6 500),volume=0.9[a4];[5]adelay=$(t 7 1500)|$(t 7 1500),volume=0.6[a5];[6]adelay=$(t 8 200)|$(t 8 200),volume=0.6[a6];\
[7]adelay=$(t 9 600)|$(t 9 600),volume=0.6[a7];[8]adelay=$(t 10 2000)|$(t 10 2000),volume=0.9[a8];\
[d][a1][a2][a3][a4][a5][a6][a7][a8]amix=inputs=9:normalize=0,alimiter=limit=0.8,volume=0.8,afade=t=out:st=$(calc "$TOTAL-2.5"):d=2.5[a]" \
 -map "[a]" -t $TOTAL -c:a aac -b:a 160k tmp/audio.m4a

ffmpeg -y -loglevel error -i tmp/video.mp4 -i tmp/audio.m4a -c:v copy -c:a aac -shortest -movflags +faststart out/farcaster_trailer$TAG.mp4
# thumbnail for the claim / X post: title frame
ffmpeg -y -loglevel error -ss $(calc "9*$S+4.5") -i out/farcaster_trailer$TAG.mp4 -frames:v 1 out/thumb$TAG.png
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height -of compact out/farcaster_trailer$TAG.mp4
