import React, { Component } from 'react'
import { Search, Grid, Segment, Table, Button, Rating, Input, Header, Image } from 'semantic-ui-react'
import axios from 'axios'
import Clarifai from 'clarifai'

import './App.css'
import 'semantic-ui-css/semantic.min.css'

// LOL please don't steal our free API key lmao
const clarifaiApp = new Clarifai.App({
  apiKey: `6bcf849cc1b04b889d8ab09af9b516f5`
})

const getMedian= (values) => {
  values.sort((a,b) => {
    return a-b
  })

  if(values.length ===0) return 0

  var half = Math.floor(values.length / 2);

  if (values.length % 2)
    return values[half];
  else
    return (values[half - 1] + values[half]) / 2.0;
}

class InstagramSearch extends Component {
  state = {
    isLoading: false,
    results: [],
    value: '',
    timeout: null
  }

  handleResultSelect = async (e, { result }) => {
    this.setState({ value: result.title })

    // Goddamnit CORS on instagram
    const { data, followers } = await axios.post('https://us-central1-hack-the-north-2018-216509.cloudfunctions.net/getInstagramUserProfile', {username: result.title}).then(x => x.data)

    const comments = data.map(x => x.comments)
    const likes = data.map(x => x.likes)
    const pictures = data.map(x => x.picture)

    // Get data on Color
    const colorData = await clarifaiApp.models.predict('eeed0b6733a644cea07cf4c60f87ebb7', pictures)
                        .then(x => x.outputs)

    // Get data on moderation
    const moderationData = await clarifaiApp.models.predict('d16f390eb32cad478c7ae150069bd2c6', pictures)
                        .then(x => x.outputs)

    // General (can see person, but can't see faces)
    const generalData = await clarifaiApp.models.predict('aaa03c23b3724a16a56b629203edc62c', pictures)
                        .then(x => x.outputs)

    // Calculate depressiveness
    const depressingColorsDict = {
      rosybrown: true,
      black: true,
      magenta: true,
      mediumpurple: true,
      blueviolet: true,
      indigo: true,
      palegoldenrod: true,
      thistle: true,
      darkorchid: true,
      darksalmon: true,
    }

    const colorScore = colorData.reduce((acc, c) => {
      const depressingColors = c.data.colors.filter(x => {
        const xprime = x.w3c.name.toLowerCase()
        return depressingColorsDict[xprime] || false
      })

      console.log(depressingColors)

      if (depressingColors.length < 3) {
        return acc
      }

      return acc + 5
    }, 0) / colorData.length

    console.log(colorScore)

    console.log(colorData)
    console.log(moderationData)
    console.log(generalData)

    // Colors that indicate depression
    // If > 2 colors have > 25% then its likely
    // OR if 2 colors have > 40% then its likely
    // If > 75% of the colors are listed below then its likely

    // 1. Rosybrown + black
    // 2. Rosybrown + black + magenta (super strong)
    // 3. *Gray (weak)
    // 4. MediumPurple + black (strong)
    // 5. BlueViolet + black
    // 6. Indigo + black
    // 7. *Gray + Black
    // 8. *Gray + Black + PaleGoldenRod
    // 9. Thistle + Black
    // 10. Dark Orchid + Black
    // 11. Linen + Black
    // 12. Dark Salmon

    // Moderation, check for drugs and gore
    // 1. drugs
    // 2. gore

    // General data (filter out <0.75 confidence)
    // 1. one
    // 2. people
    // 3. smoke
    // 4. dark
    // 5. has one/people/girl/man in it, but lacks facial expression

    // Has recurring < 3 comments
    // IF user has < 1k followers,
    // then if User like is < 10% of following, then + 1
    // else if < 3% following, then + 1

    // TODO: Grab User data
    // this.props.gatherUserData({
    //   username: result.title,
    //   isUserPrivate: result.isprivate
    // })
  }

  handleSearchChange = (e, { value }) => {
    clearTimeout(this.state.timeout)

    const timeout = setTimeout(async () => {
      const queryURL = 'https://www.instagram.com/web/search/topsearch/?context=blended&query=' + value
      const results = await axios.get(queryURL)
      const userResults = results.data.users.slice(0, 24).map((x) => {
        return {
          title: x.user.username,
          description: x.user.full_name,
          image: x.user.profile_pic_url,
          isprivate: x.user.is_private
        }
      })

      this.setState({ isLoading: false, results: userResults })
    }, 500)

    this.setState({ isLoading: true, value, timeout })
  }

  render() {
    const { isLoading, results, value } = this.state

    return (
      <Search
        input={{ fluid: true }}
        loading={isLoading}
        onResultSelect={this.handleResultSelect}
        onSearchChange={this.handleSearchChange}
        placeholder="Target Instagram profile username"
        results={results}
        value={value}
      />
    )
  }
}

class App extends Component {
  render() {
    return (
      <Grid columns={3} stackable>
        <Grid.Row stretched>
          <Grid.Column />
          <Grid.Column verticalAlign='middle' textAlign='center'>
            <Segment vertical>
              <InstagramSearch />
            </Segment>
          </Grid.Column>
          <Grid.Column />
        </Grid.Row>
      </Grid>
    )
  }
}

export default App
