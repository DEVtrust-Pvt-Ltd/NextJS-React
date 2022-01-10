import gql from "graphql-tag";

export const GET_CRATE_SONGS = gql`
  query GetCrateSongs {
    crate {
      __typename
      uri
      crate_id
      crate_songs {
        song {
          song_id
          release {
            release_id
            title
            artist
            mix
          }
          uri
          version
        }
      }
    }
  }
`;

export const CLEAR_CRATE = gql`
  mutation ClearCrate($crateId: Int!) {
    delete_crate_songs(where: { crate_id_Crate: { _eq: $crateId } }) {
      affected_rows
    }
  }
`;

export const REMOVE_SONG_FROM_CRATE = gql`
  mutation RemoveSongFromCrate($crateId: Int!, $songId: uuid!) {
    delete_crate_songs_by_pk(crate_id_Crate: $crateId, song_id_Song: $songId) {
      crate_id_Crate
      song_id_Song
    }
  }
`;
