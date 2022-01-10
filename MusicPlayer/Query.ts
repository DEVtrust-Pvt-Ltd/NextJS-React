import gql from "graphql-tag";

export const GET_MUSIC_PCM = gql`
  query GetMusicPCM($id: uuid!) {
    song_by_pk(song_id: $id) {
      release {
        artist
        title
      }
      uri
      pcm_data
    }
  }
`;
